#!/bin/bash

# AWS 배포 자동화 스크립트 - AI 개발 시스템

echo "🚀 AWS 배포 시작..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# AWS CLI 설치 확인
if ! command -v aws &> /dev/null; then
    echo -e "${YELLOW}AWS CLI가 설치되지 않았습니다. 설치 중...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install awscli
    else
        curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
        unzip awscliv2.zip
        sudo ./aws/install
    fi
fi

echo -e "${BLUE}📋 AWS 배포 옵션을 선택하세요:${NC}"
echo ""
echo "1️⃣  App Runner (추천 - 가장 간단)"
echo "2️⃣  Elastic Beanstalk (중간 복잡도)"
echo "3️⃣  ECS Fargate (고급 - Docker)"
echo "4️⃣  EC2 인스턴스 (전체 제어)"
echo ""

read -p "배포 방법을 선택하세요 (1-4): " deploy_method

case $deploy_method in
    1)
        echo -e "${GREEN}🚀 App Runner 배포 선택${NC}"
        deploy_method="apprunner"
        ;;
    2)
        echo -e "${GREEN}🚀 Elastic Beanstalk 배포 선택${NC}"
        deploy_method="beanstalk"
        ;;
    3)
        echo -e "${GREEN}🚀 ECS Fargate 배포 선택${NC}"
        deploy_method="ecs"
        ;;
    4)
        echo -e "${GREEN}🚀 EC2 배포 선택${NC}"
        deploy_method="ec2"
        ;;
    *)
        echo -e "${RED}❌ 잘못된 선택입니다. App Runner로 진행합니다.${NC}"
        deploy_method="apprunner"
        ;;
esac

# AWS 계정 설정 확인
echo -e "${BLUE}🔐 AWS 계정 설정 확인 중...${NC}"

if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${YELLOW}⚠️  AWS 계정이 설정되지 않았습니다.${NC}"
    echo -e "${BLUE}AWS 계정 정보를 입력해주세요:${NC}"
    
    read -p "AWS Access Key ID: " aws_access_key
    read -s -p "AWS Secret Access Key: " aws_secret_key
    echo ""
    read -p "AWS Region (기본: ap-northeast-2): " aws_region
    aws_region=${aws_region:-ap-northeast-2}
    
    # AWS 설정
    aws configure set aws_access_key_id "$aws_access_key"
    aws configure set aws_secret_access_key "$aws_secret_key"
    aws configure set default.region "$aws_region"
    aws configure set default.output "json"
    
    echo -e "${GREEN}✅ AWS 계정 설정 완료${NC}"
else
    echo -e "${GREEN}✅ AWS 계정이 이미 설정되어 있습니다${NC}"
    aws sts get-caller-identity
fi

# 배포 방법별 실행
case $deploy_method in
    "apprunner")
        echo -e "${BLUE}🚀 App Runner 배포 시작...${NC}"
        
        # apprunner.yaml 생성
        cat > apprunner.yaml << 'EOF'
version: 1.0
runtime: nodejs18
build:
  commands:
    build:
      - npm install --production
run:
  runtime-version: 18
  command: npm start
  network:
    port: 3000
    env: PORT
  env:
    - name: NODE_ENV
      value: production
    - name: PORT
      value: 3000
EOF
        
        echo -e "${GREEN}✅ apprunner.yaml 생성 완료${NC}"
        echo -e "${YELLOW}📝 다음 단계:${NC}"
        echo "1. AWS 콘솔에서 App Runner 서비스 생성"
        echo "2. GitHub 리포지토리 연결"
        echo "3. apprunner.yaml 설정 확인"
        echo "4. 배포 시작"
        echo ""
        echo -e "${BLUE}🌐 AWS App Runner 콘솔:${NC}"
        echo "https://console.aws.amazon.com/apprunner/"
        ;;
        
    "beanstalk")
        echo -e "${BLUE}🚀 Elastic Beanstalk 배포 시작...${NC}"
        
        # EB CLI 설치 확인
        if ! command -v eb &> /dev/null; then
            echo -e "${YELLOW}📦 EB CLI 설치 중...${NC}"
            pip3 install awsebcli --upgrade --user
        fi
        
        # .ebignore 생성
        cat > .ebignore << 'EOF'
node_modules/
.git/
.env
.env.local
docs/
tests/
*.test.js
coverage/
.DS_Store
.vscode/
EOF
        
        # Elastic Beanstalk 초기화
        echo -e "${GREEN}🔧 Elastic Beanstalk 초기화...${NC}"
        eb init --platform node.js --region ap-northeast-2
        
        # 환경 생성 및 배포
        echo -e "${GREEN}🚀 환경 생성 및 배포...${NC}"
        eb create ai-dev-system-env
        eb deploy
        
        echo -e "${GREEN}✅ Elastic Beanstalk 배포 완료${NC}"
        eb status
        ;;
        
    "ecs")
        echo -e "${BLUE}🚀 ECS Fargate 배포 시작...${NC}"
        
        # ECR 리포지토리 생성
        aws ecr create-repository --repository-name ai-dev-system --region ap-northeast-2 2>/dev/null || true
        
        # Docker 이미지 빌드
        echo -e "${GREEN}🐳 Docker 이미지 빌드 중...${NC}"
        docker build -t ai-dev-system .
        
        # ECR 로그인
        aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.ap-northeast-2.amazonaws.com
        
        # 이미지 태그 및 푸시
        account_id=$(aws sts get-caller-identity --query Account --output text)
        docker tag ai-dev-system:latest $account_id.dkr.ecr.ap-northeast-2.amazonaws.com/ai-dev-system:latest
        docker push $account_id.dkr.ecr.ap-northeast-2.amazonaws.com/ai-dev-system:latest
        
        echo -e "${GREEN}✅ Docker 이미지 ECR 업로드 완료${NC}"
        echo -e "${YELLOW}📝 다음 단계:${NC}"
        echo "1. AWS 콘솔에서 ECS 클러스터 생성"
        echo "2. Task Definition 생성"
        echo "3. 서비스 생성 및 실행"
        echo ""
        echo -e "${BLUE}🌐 AWS ECS 콘솔:${NC}"
        echo "https://console.aws.amazon.com/ecs/"
        ;;
        
    "ec2")
        echo -e "${BLUE}🚀 EC2 배포 준비...${NC}"
        
        # 키 페어 생성
        aws ec2 create-key-pair --key-name ai-dev-system-key --query 'KeyMaterial' --output text > ai-dev-system-key.pem
        chmod 400 ai-dev-system-key.pem
        
        # 보안 그룹 생성
        sg_id=$(aws ec2 create-security-group --group-name ai-dev-system-sg --description "AI Dev System Security Group" --query 'GroupId' --output text)
        aws ec2 authorize-security-group-ingress --group-id $sg_id --protocol tcp --port 22 --cidr 0.0.0.0/0
        aws ec2 authorize-security-group-ingress --group-id $sg_id --protocol tcp --port 3000 --cidr 0.0.0.0/0
        aws ec2 authorize-security-group-ingress --group-id $sg_id --protocol tcp --port 80 --cidr 0.0.0.0/0
        aws ec2 authorize-security-group-ingress --group-id $sg_id --protocol tcp --port 443 --cidr 0.0.0.0/0
        
        # EC2 인스턴스 시작
        instance_id=$(aws ec2 run-instances \
            --image-id ami-0c6e5afdd23291f73 \
            --count 1 \
            --instance-type t3.micro \
            --key-name ai-dev-system-key \
            --security-group-ids $sg_id \
            --query 'Instances[0].InstanceId' \
            --output text)
        
        echo -e "${GREEN}✅ EC2 인스턴스 생성 중: $instance_id${NC}"
        echo -e "${YELLOW}⏳ 인스턴스 시작 대기 중...${NC}"
        aws ec2 wait instance-running --instance-ids $instance_id
        
        # 공개 IP 가져오기
        public_ip=$(aws ec2 describe-instances --instance-ids $instance_id --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
        
        echo -e "${GREEN}✅ EC2 인스턴스 시작 완료${NC}"
        echo -e "${BLUE}🌐 공개 IP: $public_ip${NC}"
        echo -e "${YELLOW}📝 다음 단계:${NC}"
        echo "1. SSH 접속: ssh -i ai-dev-system-key.pem ec2-user@$public_ip"
        echo "2. Node.js 설치 및 애플리케이션 배포"
        echo "3. 방화벽 설정 확인"
        ;;
esac

echo ""
echo -e "${GREEN}🎉 AWS 배포 스크립트 실행 완료!${NC}"
echo -e "${BLUE}📚 자세한 가이드: docs/AWS_DEPLOYMENT_GUIDE.md${NC}"
