import os 
from functools import lru_cache
from pydantic_settings import BaseSettings
from dotenv import load_dotenv
load_dotenv()

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv('DATABASE_URL')


'''
- This will cache this function output
- Also on startup, as all code executed once, so this get_settings() function also runs and hence initializes the settings object on app startup
'''
@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()