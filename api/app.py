import pandas as pd
from flask import Flask, request, jsonify
from datetime import datetime, timedelta
import os
from flask_cors import CORS 
import numpy as np # 표준 편차 계산을 위해 필요

# --- 0. 데이터 로드 및 전처리 (서버 시작 시 1회 실행) ---

# TLI Gold Layer 데이터 파일 경로 설정
DATA_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'TLI_FINAL_output.csv') 
CI_DATA_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'ci_final.csv')

# 1. 데이터 로드 및 오류 처리
try:
    df_gold = pd.read_csv(DATA_FILE)
except FileNotFoundError:
    # 파일이 없는 경우, 빈 DataFrame으로 시작하여 서버 오류를 방지
    print(f"Error: 파일 '{DATA_FILE}'을 찾을 수 없습니다. 'data/' 폴더에 넣어주세요.")
    df_gold = pd.DataFrame()

try:
    df_ci = pd.read_csv(CI_DATA_FILE)
except FileNotFoundError:
    print(f"Error: 파일 '{CI_DATA_FILE}'을 찾을 수 없습니다. 'data/' 폴더에 넣어주세요.")
    df_ci = pd.DataFrame()

# 2. 컬럼 이름 정의 (사용자 파일의 실제 컬럼 이름에 맞게 수정 필수!)
PU_ID_COL = 'pu_borough'       # 출발지 자치구 이름 (String)
DO_ID_COL = 'do_borough'       # 도착지 자치구 이름 (String)
HOUR_COL = 'pickup_hour'       # 시간 (Hour, 1~12)
MIN_COL = 'pickup_min_block'   # 분 (Minute Block, 0, 15, 30, 45)
AMP_M_COL = 'pickup_ampm'      # 오전/오후 (AM/PM)

# CI 데이터 컬럼 정의
CI_BOROUGH_COL = 'BOROUGH'
CI_AMPM_COL = 'tf_ampm'
CI_HOUR_COL = 'tf_hour'
CI_MIN_COL = 'tf_min_block'
CI_VAL_COL = 'CI'

# 3. 시간 변환 및 'full_time' (24시간제) 생성 (가장 중요)
def calculate_full_time(row, hour_col, min_col, ampm_col):
    try:
        hour = int(row[hour_col])
        minute = int(row[min_col])
        ampm = row[ampm_col].upper()
        
        # 12시 기준으로 24시간제 보정 로직 (AM/PM 오류 수정)
        if ampm == 'PM' and hour != 12:
            hour += 12
        elif ampm == 'AM' and hour == 12: # 12 AM (자정)은 00시
            hour = 0
            
        # 임의의 날짜(2025-01-01)와 시간 정보를 결합하여 datetime 객체 생성
        return datetime(2025, 1, 1, hour, minute)
    except Exception:
        return pd.NaT

if not df_gold.empty:
    df_gold.columns = df_gold.columns.str.lower().str.replace('[^a-zA-Z0-9_]', '', regex=True)
    df_gold['full_time'] = df_gold.apply(lambda row: calculate_full_time(row, HOUR_COL, MIN_COL, AMP_M_COL), axis=1)
    df_gold.sort_values(by='full_time', inplace=True) # 시간 기반 검색을 위해 정렬 필수!

if not df_ci.empty:
    # CI 데이터 전처리
    df_ci['full_time'] = df_ci.apply(lambda row: calculate_full_time(row, CI_HOUR_COL, CI_MIN_COL, CI_AMPM_COL), axis=1)
    df_ci.sort_values(by='full_time', inplace=True)

# Flask 설정
app = Flask(__name__)
CORS(app) # 프론트엔드(React)와의 통신 허용

def get_nearest_ci(borough, target_time, df):
    """특정 자치구의 가장 가까운 시간대 CI 값을 찾습니다."""
    if df.empty:
        return 0.0
        
    borough_df = df[df[CI_BOROUGH_COL] == borough].copy()
    if borough_df.empty:
        return 0.0
        
    borough_df.sort_values(by='full_time', inplace=True)
    
    idx = borough_df['full_time'].searchsorted(target_time, side='left')
    
    if idx == 0:
        idx = 0
    elif idx == len(borough_df):
        idx = len(borough_df) - 1
    else:
        prev_time = borough_df['full_time'].iloc[idx-1]
        curr_time = borough_df['full_time'].iloc[idx]
        if abs(target_time - prev_time) < abs(target_time - curr_time):
            idx = idx - 1
            
    idx = min(idx, len(borough_df) - 1)
    return float(borough_df.iloc[idx][CI_VAL_COL])

# --- 3. API 엔드포인트 구현 ---
@app.route('/analyze', methods=['GET'])
def analyze_route():
    # 쿼리 파라미터로 입력 값 받기
    try:
        pu_borough = request.args.get('pu_borough')
        do_borough = request.args.get('do_borough')
        input_time_str = request.args.get('time') # 예: '06:35' (HH:MM)
        
        if not all([pu_borough, do_borough, input_time_str]):
             return jsonify({"error": "필수 파라미터(pu_borough, do_borough, time)가 누락되었습니다."}), 400

        # 입력 시간을 정렬 가능한 datetime 객체로 변환
        input_time = datetime.strptime(input_time_str, '%H:%M').time()
        # df_gold가 비어있을 수 있으므로 안전하게 처리
        base_date = df_gold['full_time'].iloc[0].date() if not df_gold.empty else datetime(2025, 1, 1).date()
        input_datetime = datetime.combine(base_date, input_time)

    except Exception as e:
        return jsonify({"error": f"잘못된 시간 형식 또는 파라미터입니다. ({e})"}), 400

    if df_gold.empty:
        return jsonify({"error": "서버에 데이터 파일이 로드되지 않았습니다."}), 500

    # 1. 경로 필터링
    filtered_df = df_gold[
        (df_gold[PU_ID_COL] == pu_borough) & 
        (df_gold[DO_ID_COL] == do_borough)
    ].copy()

    if filtered_df.empty:
        return jsonify({"error": f"'{pu_borough}'에서 '{do_borough}' 경로 데이터가 없습니다."}), 404

    # 2. 가장 가까운 현재 시간 매치 찾기 (Task 1)
    # searchsorted: 입력 시간에 가장 가까운 인덱스를 빠르게 찾음 (시간 정렬된 데이터프레임에서만 작동)
    # searchsorted: 입력 시간에 가장 가까운 인덱스를 빠르게 찾음 (시간 정렬된 데이터프레임에서만 작동)
    # side='left'로 삽입 위치를 찾은 후, 앞뒤 값을 비교하여 더 가까운 쪽을 선택
    idx = filtered_df['full_time'].searchsorted(input_datetime, side='left')
    
    if idx == 0:
        idx = 0
    elif idx == len(filtered_df):
        idx = len(filtered_df) - 1
    else:
        # 앞(idx-1)과 뒤(idx) 중 더 가까운 것 선택
        prev_time = filtered_df['full_time'].iloc[idx-1]
        curr_time = filtered_df['full_time'].iloc[idx]
        
        if abs(input_datetime - prev_time) < abs(input_datetime - curr_time):
            idx = idx - 1
        else:
            idx = idx
            
    idx = min(idx, len(filtered_df) - 1) 
    
    current_match_row = filtered_df.iloc[idx]
    
    # 3. 인접한 6개 행 조회 (Task 2: 앞 3개, 뒤 3개)
    start_idx = max(0, idx - 3)
    end_idx = min(len(filtered_df), idx + 4) # 현재 행 포함 7개 범위 추출
    
    nearest_rows = filtered_df.iloc[start_idx:end_idx]
    
    # 4. 결과 구조화
    
    # std_duration 계산 (Task 2에서 요구된 값)
    std_dev_calc = np.sqrt(current_match_row['var_duration']) if current_match_row['var_duration'] >= 0 else 0.0

    # CI Score 계산 (출발지 CI + 도착지 CI) / 2
    pu_ci = get_nearest_ci(pu_borough, input_datetime, df_ci)
    do_ci = get_nearest_ci(do_borough, input_datetime, df_ci)
    avg_ci = (pu_ci + do_ci) / 2

    # Task 1: 현재 매치
    current_data = {
        'tli': float(current_match_row['tli']),
        'avg_duration': float(current_match_row['avg_duration']),
        'std_duration': float(std_dev_calc),
        'time': current_match_row['full_time'].strftime('%H:%M:%S'),
        'avg_distance': float(current_match_row['avg_trip_distance']),
        'avg_cost': float(current_match_row['avg_total_amount']),
        'ci_score': float(avg_ci),
        'is_exact': bool(current_match_row['full_time'] == input_datetime)
    }

    past_times = []
    future_times = []

    # Task 2: 인접한 시간대 분리
    for _, row in nearest_rows.iterrows():
        # 현재 매치된 행은 건너뜁니다.
        if row.name == current_match_row.name: 
            continue

        item = {
            'tli': float(row['tli']),
            'avg_duration': float(row['avg_duration']),
            'std_duration': float(np.sqrt(row['var_duration'])) if row['var_duration'] >= 0 else 0.0,
            'time': row['full_time'].strftime('%H:%M:%S'),
            'avg_distance': float(row['avg_trip_distance']),
            'avg_cost': float(row['avg_total_amount']),
        }

        # 앞 3개, 뒤 3개를 분리하고 최대 3개까지만 포함
        if row['full_time'] < current_match_row['full_time'] and len(past_times) < 3:
            past_times.append(item)
        elif row['full_time'] > current_match_row['full_time'] and len(future_times) < 3:
            future_times.append(item)

    # 5. 최종 JSON 반환
    return jsonify({
        "status": "success",
        "current_match": current_data, # Task 1 결과
        "nearest_past": sorted(past_times, key=lambda x: x['time'], reverse=True), # Task 2 앞 3개 (내림차순 정렬)
        "nearest_future": sorted(future_times, key=lambda x: x['time'], reverse=False) # Task 2 뒤 3개 (오름차순 정렬)
    })

if __name__ == '__main__':
    # 서버 실행 (터미널에서 'python app.py' 실행)
    print("\n--- TLI 분석 API 서버 시작 ---")
    print("API 엔드포인트 예시: http://127.0.0.1:5000/analyze?pu_borough=Manhattan&do_borough=Bronx&time=07:30")
    print("----------------------------")
    app.run(debug=True, port=5001)
