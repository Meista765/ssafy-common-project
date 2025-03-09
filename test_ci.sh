#!/bin/bash

set -e  # 에러 발생 시 즉시 종료

echo "🚀 Starting local GitLab CI/CD pipeline test..."

export $(grep -v '^#' .env | xargs)

# 1️⃣ GitLab Runner 환경과 동일하게 Docker 컨테이너 내부에서 실행
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$(pwd)":/workspace \
  -w /workspace \
  --env DOCKER_USERNAME="$DOCKER_USERNAME" \
  --env DOCKER_PASSWORD="$DOCKER_PASSWORD" \
  --env DEPLOY_SSH_PRIVATE_KEY="$DEPLOY_SSH_PRIVATE_KEY" \
  docker:latest sh -c '
    set -e
    apk add --no-cache docker-compose
    
    
    # 2️⃣ Docker 로그인
    echo "🔑 Logging in to Docker..."
    echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin

    # 3️⃣ Backend 빌드 및 푸시
    echo "🏗  Building Backend..."
    docker build -t kwon0528/b106-backend:release -f Backend/Dockerfile.prod ./Backend
    docker push kwon0528/b106-backend:release

    # 4️⃣ Frontend 빌드 및 푸시
    echo "🎨 Building Frontend..."
    docker build -t kwon0528/b106-frontend:release -f Frontend/Dockerfile.prod ./Frontend
    docker push kwon0528/b106-frontend:release


    # 1️⃣ Docker 컨테이너 실행
    echo "🧪 Running Tests..."
    BACKEND_CONTAINER_ID=$(docker run -d kwon0528/b106-backend:release)
    FRONTEND_CONTAINER_ID=$(docker run -d kwon0528/b106-frontend:release)

    # 2️⃣ 컨테이너 로그 출력 (비동기 실행)
    echo "🔍 Checking Backend logs..."
    docker logs -f "$BACKEND_CONTAINER_ID" &
    BACKEND_LOG_PID=$!

    echo "🔍 Checking Frontend logs..."
    docker logs -f "$FRONTEND_CONTAINER_ID" &
    FRONTEND_LOG_PID=$!

    # 3️⃣ 컨테이너 상태 확인
    sleep 10  # 컨테이너가 충분히 실행될 시간을 줌
    BACKEND_STATUS=$(docker inspect -f '{{.State.Running}}' "$BACKEND_CONTAINER_ID")
    FRONTEND_STATUS=$(docker inspect -f '{{.State.Running}}' "$FRONTEND_CONTAINER_ID")

    if [[ "$BACKEND_STATUS" == "true" && "$FRONTEND_STATUS" == "true" ]]; then
        echo "✅ Both containers are running successfully!"
    else
        echo "❌ Error: One or both containers failed to start."
        docker ps -a  # 현재 실행 중인 컨테이너 목록 출력
        exit 1
    fi
  '

echo "✅ Local CI/CD pipeline test completed successfully!"
