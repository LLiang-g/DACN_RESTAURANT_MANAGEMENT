#!/usr/bin/env python3
"""Create a BCrypt hash using the backend image, without accessing MySQL."""
import getpass
import pathlib
import subprocess
import sys


def main():
    password = getpass.getpass("Mật khẩu mới: ")
    if not password or len(password.encode("utf-8")) > 72 or "\n" in password or "\r" in password:
        sys.exit("Mật khẩu phải có từ 1 đến 72 byte UTF-8 và không chứa xuống dòng.")
    if password != getpass.getpass("Nhập lại mật khẩu: "):
        sys.exit("Hai mật khẩu không khớp.")
    root = pathlib.Path(__file__).resolve().parents[1]
    command = ["docker", "compose", "run", "--rm", "--no-deps", "-T", "--entrypoint", "java", "backend",
               "-Dloader.main=com.sccgroup.restaurant_management.admin.tools.AdminPasswordHasher",
               "-cp", "/app/app.jar", "org.springframework.boot.loader.launch.PropertiesLauncher"]
    try:
        result = subprocess.run(command, cwd=root, input=password + "\n", encoding="utf-8",
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    except FileNotFoundError:
        sys.exit("Không tìm thấy Docker. Cài và mở Docker Desktop trước.")
    except subprocess.CalledProcessError as exc:
        print(exc.stderr, file=sys.stderr)
        sys.exit("Không tạo được hash. Hãy chạy docker compose build backend rồi thử lại.")
    hashed = result.stdout.strip()
    if not hashed.startswith(("$2a$", "$2b$", "$2y$")) or len(hashed) != 60:
        sys.exit("Kết quả không phải hash BCrypt hợp lệ.")
    print("\nBCrypt hash:\n" + hashed)
    print("\nDán hash vào password_hash của đúng tài khoản ADMIN trong staff_account.")
    print("Script không thay đổi database.")


if __name__ == "__main__":
    main()
