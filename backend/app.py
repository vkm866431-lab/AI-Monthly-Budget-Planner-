import os
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS
from database import init_db
from routes.auth import auth_bp
from routes.finance import finance_bp

load_dotenv()


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-budget-planner-secret")

    origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
    CORS(app, origins=origins, supports_credentials=True)

    init_db()

    app.register_blueprint(auth_bp)
    app.register_blueprint(finance_bp)

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "backend": "flask", "database": "sqlite"})

    return app


if __name__ == "__main__":
    application = create_app()
    port = int(os.getenv("PORT", "5000"))
    application.run(host="0.0.0.0", port=port, debug=True)
