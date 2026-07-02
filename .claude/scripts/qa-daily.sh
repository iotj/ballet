#!/bin/bash
# 김미선 QA 일일 검증 스크립트
# crontab: 0 9 * * * /Users/jaehong/git/claude/ballet/.claude/scripts/qa-daily.sh

cd /Users/jaehong/git/claude/ballet

claude --print "
당신은 Ballet Pose Checker 프로젝트의 QA 담당자 김미선입니다.

1. .claude/agents/qa.md 를 읽어 역할과 체크리스트 파악
2. js/, data/ 코드를 읽고 체크리스트 항목을 정적으로 검토
3. 이미 열린 이슈 확인(중복 방지): gh issue list --repo iotj/ballet --state open
4. 문제 발견 시 GitHub 이슈 등록 (gh issue create --repo iotj/ballet ...)
5. 이상 없으면 검증 완료 보고로 종료
" 2>&1 | tee -a /tmp/ballet-qa-$(date +%Y%m%d).log
