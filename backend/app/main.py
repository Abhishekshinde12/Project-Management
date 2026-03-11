from fastapi import FastAPI 
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, user

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True, # required for cookies to be sent cross-origin
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(auth.router)
app.include_router(user.router)

@app.get('/')
def test():
    return {"message" : "API is Running!!!"}