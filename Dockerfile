# Build stage: Dùng JDK 21 để đóng gói code
FROM eclipse-temurin:21-jdk-jammy AS builder
WORKDIR /app

# Copy các file cấu hình Gradle trước để tận dụng Docker layer cache
COPY gradlew .
COPY gradle ./gradle
COPY build.gradle.kts settings.gradle.kts ./
RUN sed -i 's/\r$//' gradlew && chmod +x gradlew

# Chỉ áp dụng trong Docker: mạng tải Gradle chậm có thể thử lại.
RUN sed -i 's/^networkTimeout=.*/networkTimeout=120000/; s/^retries=.*/retries=3/; s/^retryBackOffMs=.*/retryBackOffMs=2000/' gradle/wrapper/gradle-wrapper.properties

# Copy mã nguồn backend
COPY src ./src

# Build file .jar, bỏ qua kiểm tra database trong lúc build image (-x test)
RUN --mount=type=cache,target=/root/.gradle ./gradlew bootJar -x test --no-daemon --console=plain

# Run stage: Dùng JRE 21 để chạy ứng dụng (giúp image nhẹ hơn)
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
ENV JAVA_TOOL_OPTIONS="-Dfile.encoding=UTF-8 -Dsun.stdout.encoding=UTF-8 -Dsun.stderr.encoding=UTF-8"
COPY --from=builder /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
