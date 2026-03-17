FROM python:3.12-slim 

WORKDIR /app 

# apt-get update => update the package list from repo so the system know the latest versions available
# apt-get install -y => install build essential packages, eg. gcc, g++, make. -y = auto yes for installation
# && => only run further command if previous one successfuly executes
# rm - rf => delete cached package list to reduce disk space
RUN apt-get update && apt-get install -y \
    build-essential \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .  

# don't use cached packages install new ones
RUN pip install --no-cahce-dir -r requirements.txt

COPY . .

RUN chmod +x entrypoint.sh

EXPOSE 8000

# CMD ["fastapi", "run"]
CMD ["./entrypoint.sh"]