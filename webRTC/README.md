# Backup

### .env필수
FE에서 .env 필요

Vite로 프론트엔드 생성하였기에 환경변수 앞에 `VITE`필수수

### *Backend Server*
VITE_BACKEND_IP= `YOUR_SERVER_IP`

VITE_BACKEND_PORT=`YOUR_PORT` *ex)8000*

VITE_BACKEND_PROTOCOL=`YOUR_PROTOCOL` *ex) http or https*

### *OpenVidu Server*
VITE_OPENVIDU_IP=`YOUR_OPENVIDU_IP`

VITE_OPENVIDU_PORT=`YOUR_OPENVIDU_PORT`

VITE_OPENVIDU_PROTOCOL=`YOUR_OPENVIDU_PROTOCOL`

VITE_OPENVIDU_SERVER_SECRET=`YOUT_OPENVIDU_SERVER_SECRET`

### FE
- cd frontend
- npm install
- npm run dev
### BE
- cd backend
- pip install -r requirements.txt
- python main.py