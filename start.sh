#!/bin/bash
# OpenMAIC 启动脚本
# 用法: ./start.sh [start|stop|restart|status|logs]

cd "$(dirname "$0")"

PORT=3002
APP_NAME="open-maic"

start() {
    if ss -tlnp | grep -q ":$PORT "; then
        echo "⚠️  端口 $PORT 已被占用"
        return 1
    fi
    echo "🚀 启动 $APP_NAME (端口 $PORT)..."
    PORT=$PORT nohup pnpm dev > .next/dev.log 2>&1 &
    echo $! > .next/dev.pid
    sleep 3
    if ss -tlnp | grep -q ":$PORT "; then
        echo "✅ 启动成功 http://localhost:$PORT"
    else
        echo "❌ 启动失败，查看日志: .next/dev.log"
    fi
}

stop() {
    # 先通过端口杀进程（最可靠）
    PID=$(ss -tlnp 2>/dev/null | grep ":$PORT " | grep -oP 'pid=\K[0-9]+' | head -1)
    if [ -n "$PID" ]; then
        echo "🛑 停止 $APP_NAME (PID: $PID)..."
        kill $PID 2>/dev/null
        sleep 1
        rm -f .next/dev.pid
        echo "✅ 已停止"
        return 0
    fi
    
    # 备用：通过 PID 文件
    if [ -f .next/dev.pid ]; then
        PID=$(cat .next/dev.pid)
        if kill -0 $PID 2>/dev/null; then
            echo "🛑 停止 $APP_NAME (PID: $PID)..."
            kill $PID
            echo "✅ 已停止"
        else
            echo "⚠️  进程不存在"
        fi
        rm -f .next/dev.pid
    else
        echo "⚠️  服务未运行"
    fi
}

status() {
    if ss -tlnp | grep -q ":$PORT "; then
        PID=$(ss -tlnp | grep ":$PORT " | grep -oP 'pid=\K[0-9]+' | head -1)
        echo "✅ $APP_NAME 运行中 (PID: $PID, 端口: $PORT)"
        echo "   地址: http://localhost:$PORT"
    else
        echo "⏹️  $APP_NAME 未运行"
    fi
}

logs() {
    if [ -f .next/dev.log ]; then
        tail -100f .next/dev.log
    else
        echo "⚠️  日志文件不存在"
    fi
}

case "${1:-start}" in
    start)  start ;;
    stop)   stop ;;
    restart) stop; sleep 2; start ;;
    status) status ;;
    logs)   logs ;;
    *)
        echo "用法: $0 {start|stop|restart|status|logs}"
        exit 1
        ;;
esac