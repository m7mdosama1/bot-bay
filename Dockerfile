ARG BOT_NAME
WORKDIR /app

COPY apps/bot-${BOT_NAME}/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY packages/db/ ./packages/db/
COPY apps/bot-${BOT_NAME}/bot.py ./bot.py

ENV PYTHONPATH=/app/packages/db

CMD ["python", "bot.py"]
