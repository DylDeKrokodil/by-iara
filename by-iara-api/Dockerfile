FROM eclipse-temurin:21-jdk-alpine AS build

WORKDIR /workspace
COPY . .
RUN ./gradlew --no-daemon bootJar

FROM eclipse-temurin:21-jre-alpine

WORKDIR /app
COPY --from=build /workspace/build/libs/*.jar app.jar
RUN addgroup -S byiara && adduser -S -G byiara -h /app byiara \
    && chown -R byiara:byiara /app
USER byiara
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
