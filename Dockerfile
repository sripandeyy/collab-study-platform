# Stage 1: Build the application securely using Maven
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
# Copy over the maven configurations and raw source code
COPY pom.xml .
COPY src ./src
# Excecute the maven packaging lifecycle
RUN mvn clean package -DskipTests

# Stage 2: Extract the artifact and run the pure Java environment
FROM openjdk:17-jdk-slim
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
