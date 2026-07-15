import { AppError } from '../core/errors/AppError.js';

export const globalErrorHandler = (err, req, res, next) => {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({ success: false, error: err.message });
    }

    if (err.name === 'ValidationError') {
        return res.status(400).json({ success: false, error: err.message });
    }

    if (err.code === 'P2002') {
        return res.status(409).json({ success: false, error: 'Registro duplicado' });
    }

    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, error: 'Token inválido o expirado' });
    }

    console.error(err);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
};
