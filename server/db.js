import { Sequelize, DataTypes } from 'sequelize';

export const sequelize = new Sequelize('TorqueGarage', 'postgres', 'root', {
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    logging: false,
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
