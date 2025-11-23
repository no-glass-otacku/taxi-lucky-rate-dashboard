import pandas as pd
from flask import Flask, request, jsonify
from datetime import datetime, timedelta
import os
from flask_cors import CORS 
import numpy as np # 표준 편차 계산을 위해 필요

# --- 0. 데이터 로드 및 전처리 (서버 시작 시 1회 실행) ---

# TLI Gold Layer 데이터 파일 경로 설정
DATA_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'TLI_FINAL_output.csv') 

# 1. 데이터 로드 및 오류 처리
try:
    df_gold = pd.read_csv(DATA_FILE)
except FileNotFoundError:
    # 파일이 없는 경우, 빈 DataFrame으로 시작하여 서버 오류를 방지
    print(f"Error: 파일 '{DATA_FILE}'을 찾을 수 없습니다. 'data/' 폴더에 넣어주세요.")
    df_gold = pd.DataFrame()

# 2. 컬럼 이름 정의 (사용자 파일의 실제 컬럼 이름에 맞게 수정 필수!)
PU_ID_COL = 'pu_borough'       # 출발지 자치구 이름 (String)
DO_ID_COL = 'do_borough'       # 도착지 자치구 이름 (String)
HOUR_COL = 'pickup_hour'       # 시간 (Hour, 1~12)
MIN_COL = 'pickup_min_block'   # 분 (Minute Block, 0, 15, 30, 45)
AMP_M_COL = 'pickup_ampm'      # 오전/오후 (AM/PM)

# 3. 시간 변환 및 'full_time' (24시간제) 생성 (가장 중요)
if not df_gold.empty:
    df_gold.columns = df_gold.columns.str.lower().str.replace('[^a-zA-Z0-9_]', '', regex=True)

    def calculate_full_time(row):
        try:
            hour = row[HOUR_COL]
            minute = row[MIN_COL]
            ampm = row[AMP_M_COL].upper()
            
            # 12시 기준으로 24시간제 보정 로직 (AM/PM 오류 수정)
            if ampm == 'PM' and hour != 12:
                hour += 12
            elif ampm == 'AM' and hour == 12: # 12 AM (자정)은 00시
                hour = 0
                
            # 임의의 날짜(2025-01-01)와 시간 정보를 결합하여 datetime 객체 생성
            return datetime(2025, 1, 1, hour, minute)
        except Exception:
            return pd.NaT

    df_gold['full_time'] = df_gold.apply(calculate_full_time, axis=1)
    df_gold.sort_values(by='full_time', inplace=True) # 시간 기반 검색을 위해 정렬 필수!

# Flask 설정
app = Flask(__name__)
CORS(app) # 프론트엔드(React)와의 통신 허용

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
        input_datetime = datetime.combine(df_gold['full_time'].iloc[0].date(), input_time)

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
    idx = filtered_df['full_time'].searchsorted(input_datetime, side='nearest')
    idx = min(idx, len(filtered_df) - 1) 
    
    current_match_row = filtered_df.iloc[idx]
    
    # 3. 인접한 6개 행 조회 (Task 2: 앞 3개, 뒤 3개)
    start_idx = max(0, idx - 3)
    end_idx = min(len(filtered_df), idx + 4) # 현재 행 포함 7개 범위 추출
    
    nearest_rows = filtered_df.iloc[start_idx:end_idx]
    
    # 4. 결과 구조화
    
    # std_duration 계산 (Task 2에서 요구된 값)
    std_dev_calc = np.sqrt(current_match_row['var_duration']) if current_match_row['var_duration'] >= 0 else 0.0

    # Task 1: 현재 매치
    current_data = {
        'tli': current_match_row['tli'].item(),
        'avg_duration': current_match_row['avg_duration'].item(),
        'std_duration': std_dev_calc.item(),
        'time': current_match_row['full_time'].strftime('%H:%M:%S'),
        'is_exact': current_match_row['full_time'] == input_datetime
    }

    past_times = []
    future_times = []

    # Task 2: 인접한 시간대 분리
    for _, row in nearest_rows.iterrows():
        # 현재 매치된 행은 건너뜁니다.
        if row.name == current_match_row.name: 
            continue

        item = {
            'tli': row['tli'].item(),
            'avg_duration': row['avg_duration'].item(),
            'std_duration': np.sqrt(row['var_duration']).item() if row['var_duration'] >= 0 else 0.0,
            'time': row['full_time'].strftime('%H:%M:%S'),
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
    app.run(debug=True, port=5000)
