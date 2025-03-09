import subprocess
import sys
from datetime import datetime

def run_migration():
    try:
        # 현재 시간을 이용한 마이그레이션 메시지 생성
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        message = f"auto_migration_{timestamp}"
        
        # 자동 마이그레이션 생성
        subprocess.run([
            "alembic", 
            "revision", 
            "--autogenerate", 
            "-m", 
            message
        ], check=True)
        
        # 마이그레이션 적용
        subprocess.run([
            "alembic", 
            "upgrade", 
            "head"
        ], check=True)
        
        print("✅ 마이그레이션이 성공적으로 완료되었습니다.")
        
    except subprocess.CalledProcessError as e:
        print(f"❌ 마이그레이션 중 오류가 발생했습니다: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_migration()