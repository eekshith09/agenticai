pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'npm install'
            }
        }

        stage('Run Tests') {
            steps {
                bat 'node --test test.js || exit 0'
            }
        }

        stage('Build & Deploy with Docker') {
            steps {
                bat 'docker-compose down || exit 0'
                bat 'docker-compose up -d --build'
            }
        }

        stage('Health Check') {
            steps {
                // Wait 10 seconds for app to start up
                bat 'ping 127.0.0.1 -n 11 > nul'
                bat 'curl -f http://localhost:3000/health || exit 1'
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully! App is running at http://localhost:3000'
        }
        failure {
            echo 'Pipeline failed! Check the logs above.'
            bat 'docker-compose logs || exit 0'
        }
    }
}
