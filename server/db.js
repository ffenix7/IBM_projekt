import { Sequelize, DataTypes } from 'sequelize';

const connectionString = process.env.DB_URL || 'postgres://postgres:root@localhost:5432/TorqueGarage';

export const sequelize = new Sequelize(connectionString, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
        // Render wymaga SSL dla połączeń z bazą danych
        ssl: process.env.NODE_ENV === 'production' ? {
            require: true,
            rejectUnauthorized: false,
        } : false,
    },
});

export const Users = sequelize.define('Users', {
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    subscriptionTier: {
        type: DataTypes.ENUM('free', 'vip'),
        allowNull: false,
        defaultValue: 'free',
    },
    build_slots: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
    }
});