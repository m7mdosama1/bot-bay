FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (for caching)
COPY apps/bot-runner/requirements.txt ./apps/bot-runner/requirements.txt
RUN pip install --no-cache-dir -r apps/bot-runner/requirements.txt

# Copy shared db package
COPY packages/db/ ./packages/db/
COPY shared/ ./shared/

# Copy all bot source directories
COPY apps/bot-verification/ ./apps/bot-verification/
COPY apps/bot-giveaway/ ./apps/bot-giveaway/
COPY apps/bot-roulette/ ./apps/bot-roulette/
COPY apps/bot-admin/ ./apps/bot-admin/
COPY apps/bot-ticket/ ./apps/bot-ticket/
COPY apps/bot-welcome/ ./apps/bot-welcome/
COPY apps/bot-beacon/ ./apps/bot-beacon/
COPY apps/bot-pulse/ ./apps/bot-pulse/
COPY apps/bot-ascend/ ./apps/bot-ascend/

# Copy the runner script to the same relative path as in the repo
COPY apps/bot-runner/run-all-bots.py ./apps/bot-runner/run-all-bots.py

# Set Python path to find shared models
ENV PYTHONPATH=/app:/app/packages/db

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD python -c "import sys; sys.exit(0)"

CMD ["python", "apps/bot-runner/run-all-bots.py"]
