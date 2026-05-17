import socket
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
try:
    s.connect(('127.0.0.1', 5432))
    print("Port 5432 is OPEN")
except Exception as e:
    print(f"Port 5432 is CLOSED: {e}")
finally:
    s.close()
