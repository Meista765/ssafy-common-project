import socket

ip = "222.107.238.124"
port = 8888

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.settimeout(3)  # 3초 타임아웃

result = sock.connect_ex((ip, port))
if result == 0:
    print(f"포트 {port} 열려 있음!")
else:
    print(f"포트 {port} 닫혀 있음!")
sock.close()
