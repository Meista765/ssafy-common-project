#!/bin/sh

git merge --no-commit --no-ff develop

# 현재 브랜치 확인
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo CURRENT_BRANCH

# 병합 대상이 release 브랜치인 경우 특정 파일 삭제
if [ "$CURRENT_BRANCH" = "release" ]; then
    echo "🔹 Merging into release branch - Removing unnecessary files..."
    
    FILES_TO_REMOVE=(
        ".env"
        "docker-compose.override.yml"
        "Dockerfile.dev"
        "*.log"
        # "node_modules/"
        # "src/"
        # "public/"
    )

    # 모든 경로에서 해당 파일을 검색하고 삭제
    for pattern in "${FILES_TO_REMOVE[@]}"; do
        # `git ls-files`를 사용하여 Git에 등록된 모든 파일 중에서 해당 패턴과 일치하는 파일 찾기
        git ls-files --cached --ignored --exclude="$pattern" | while read -r found_file; do
            # Git에서 삭제
            git rm -r "$found_file" 2>/dev/null && echo "✅ Removed from Git: $found_file" || echo "⚠️ Warning: $found_file not found in Git"

            # 실제 파일 시스템에서 삭제
            rm -rf "$found_file" 2>/dev/null && echo "🗑️ Removed from disk: $found_file" || echo "⚠️ Warning: $found_file not found on disk"
        done
    done

    echo "✅ Selected files removed before merging into release branch."
fi
