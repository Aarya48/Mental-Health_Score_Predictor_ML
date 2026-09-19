import os
import joblib
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Literal, Optional
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

model = joblib.load('Mental_Health_Model.pkl')
top_countries = ['Other','India','USA','Canada','Australia','UK','Germany','Mexico','Turkey','France']

app = FastAPI(title="Mental Health Predictor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StudentData(BaseModel):
    age                     : int = Field(..., ge=10, le=100)
    gender                  : Literal['Male', 'Female']
    country                 : str
    academic_level          : Literal['Undergraduate', 'Graduate', 'High School']
    most_used_platform      : Literal['Facebook', 'LinkedIn', 'Instagram', 'Snapchat','Twitter','YouTube', 'TikTok', 'LINE', 'KakaoTalk', 'VKontakte', 'WhatsApp','WeChat']
    purpose_of_use          : Literal['Networking', 'Education', 'Entertainment', 'News']
    avg_daily_usage_hours   : float = Field(..., ge=0, le=24)
    daily_unlocks           : int   = Field(..., ge=0)
    study_hours             : float = Field(..., ge=0, le=24)
    physical_activity_hours : float = Field(..., ge=0, le=24)
    sleep_hours_per_night   : float = Field(..., ge=0, le=24)
    stress_level            : Literal['Medium', 'Low', 'Very High', 'High']


class PredictionResponse(BaseModel):
    predicted_mental_health_score: float
    score: Optional[float] = None


@app.get('/')
def serve_frontend():
    if os.path.exists("index.html"):
        return FileResponse("index.html")
    elif os.path.exists("index(3).html"):
        return FileResponse("index(3).html")
    return {"message": "Mental Health Predictor API is running. Visit /docs for documentation."}


@app.get('/style.css')
def serve_css():
    if os.path.exists("style.css"):
        return FileResponse("style.css", media_type="text/css")


@app.get('/script.js')
def serve_js():
    if os.path.exists("script.js"):
        return FileResponse("script.js", media_type="application/javascript")


@app.post('/predict', response_model=PredictionResponse) 
def predict(data: StudentData):
    raw_country = data.country.strip()
    matched_country = next((c for c in top_countries if c.lower() == raw_country.lower()), "Other")

    input_row = pd.DataFrame([{
        'Age'                       : data.age,
        'Gender'                    : data.gender,
        'Country'                   : data.country,
        'Academic_Level'            : data.academic_level,
        'Most_Used_Platform'        : data.most_used_platform,
        'Purpose_Of_Use'            : data.purpose_of_use,
        'Avg_Daily_Usage_Hours'     : data.avg_daily_usage_hours,
        'Daily_Unlocks'             : data.daily_unlocks,
        'Study_Hours'               : data.study_hours,
        'Physical_Activity_Hours'   : data.physical_activity_hours,
        'Sleep_Hours_Per_Night'     : data.sleep_hours_per_night,
        'Stress_Level'              : data.stress_level,
        'Grouped_Country'           : matched_country
    }])

    prediction = model.predict(input_row)[0] 
    rounded_score = round(float(prediction), 2)
    return PredictionResponse(
        predicted_mental_health_score=rounded_score,
        score=rounded_score
    )