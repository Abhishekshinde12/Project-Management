import os 
from functools import lru_cache
from pydantic_settings import BaseSettings
from dotenv import load_dotenv
load_dotenv()

class Settings(BaseSettings):
    # DATABASE_URL: str = os.getenv('DATABASE_URL')
    # ALEMBIC_DATABASE_URL: str = os.getenv('ALEMBIC_DATABASE_URL')

    DATABASE_USERNAME: str = os.getenv('DATABASE_USERNAME')
    DATABASE_PASSWORD: str = os.getenv('DATABASE_PASSWORD')
    DATABASE_HOST: str = os.getenv('DATABASE_HOST')
    DATABASE_PORT: int = os.getenv('DATABASE_PORT')
    DATABASE_NAME: str = os.getenv('DATABASE_NAME')


    ACCESS_TOKEN_SECRET: str = os.getenv('ACCESS_TOKEN_SECRET')
    ACCESS_TOKEN_EXPIRE_MINUTES: int = os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES')
    REFRESH_TOKEN_SECRET: str = os.getenv('REFRESH_TOKEN_SECRET')
    REFRESH_TOKEN_EXPIRE_DAYS: int = os.getenv('REFRESH_TOKEN_EXPIRE_DAYS')
    ALGORITHM: str = os.getenv('ALGORITHM')

'''
- This will cache this function output
- Also on startup, as all code executed once, so this get_settings() function also runs and hence initializes the settings object on app startup
'''
@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()