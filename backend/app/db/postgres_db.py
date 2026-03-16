from sqlalchemy.engine import URL
from sqlmodel import SQLModel, create_engine, Session
from app.config import settings 

DATABASE_URL = URL.create(
    drivername='postgresql+psycopg2',
    username=settings.DATABASE_USERNAME,
    password=settings.DATABASE_PASSWORD,
    host=settings.DATABASE_HOST,
    port=settings.DATABASE_PORT,
    database=settings.DATABASE_NAME
)

engine = create_engine(DATABASE_URL)

def get_session():
    with Session(engine) as session:
        yield session 