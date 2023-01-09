/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
"use strict";
const { Model, Op } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Todo extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Todo.belongsTo(models.User, {
        foreignKey: 'userId'
      })
    }

    static getTodos() {
      return this.findAll();
    }

    static async completedItems(userId) {
      return await Todo.findAll({
        where: {
          userId,
          completed: true
        },

        order: [["id", "ASC"]],
      });
    }
    static async dueToday(userId) {
      return this.findAll({
        where: { dueDate: new Date(),userId,completed:false },
        order: [["id", "ASC"]],
      });
    }

    static async dueLater(userId) {
      return this.findAll({
        where: { dueDate: { [Op.gt]: new Date()},userId, completed:false   }, 
        order: [["id", "ASC"]],
      });
    }
    static async overdue(userId) {
      return this.findAll({
        where: { 
          dueDate: { 
            [Op.lt]: new Date(),
          },
          userId,
        completed:false   }, //greater than the duedate
        order: [["id", "ASC"]],
      });
    }

    static async remove(id,userId) {
      return this.destroy({
        where: {
          id,
          userId,
        },
      });
    }

    static addTodo({ title, dueDate ,userId}) {
      //refactoring for business logic and we can add a todo at any endpoint
      return this.create({ title: title, dueDate: dueDate, completed: false,userId});
    }
    static async completedItems() {
      return await Todo.findAll({
        where: {
          completed: true,
        },

        order: [["id", "ASC"]],
      });
    }

    static markAsCompleted() {
      return this.update({ completed: true });
    }
    setCompletionStatus(completed) {
      return this.update({
        completed: completed, 
        where: {
          userId,
        },
        
      });
    }
  }
  Todo.init(
    {
      title: DataTypes.STRING,
      dueDate: DataTypes.DATEONLY,
      completed: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "Todo",
    }
  );
  return Todo;
};