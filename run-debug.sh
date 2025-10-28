#!/bin/bash
# Script to run Java Spring Boot in debug mode

echo "Starting Java Spring Boot in debug mode..."
cd java-auth-service

# Run with debug arguments
mvn spring-boot:run \
  -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005"
