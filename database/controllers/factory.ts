// @ts-nocheck
"use strict";

export default function createFactory(model: any, primaryKey: string) {
    if (!model) return null;
    const isSequelize = !!model.sequelize;

    return {
        createData: async (id: any, data: any = {}) => {
            try {
                return await model.create({ [primaryKey]: id, ...data });
            } catch (e) {
                console.error(`Error creating data for ${primaryKey}:`, e);
                return null;
            }
        },
        getData: async (id: any) => {
            try {
                if (isSequelize) {
                    return await model.findOne({ where: { [primaryKey]: id } });
                }
                return await model.findOne({ [primaryKey]: id });
            } catch (r) {
                console.error(`Error getting data for ${primaryKey}:`, r);
                return null;
            }
        },
        setData: async (id: any, data: any) => {
            try {
                if (isSequelize) {
                    const record = await model.findOne({ where: { [primaryKey]: id } });
                    if (record) return await record.update(data);
                    return false;
                }
                const res = await model.updateOne({ [primaryKey]: id }, { $set: data });
                return res.modifiedCount > 0;
            } catch (e) {
                console.error(`Error setting data for ${primaryKey}:`, e);
                return false;
            }
        },
        delData: async (id: any) => {
            try {
                if (isSequelize) {
                    const count = await model.destroy({ where: { [primaryKey]: id } });
                    return count > 0;
                }
                const res = await model.deleteOne({ [primaryKey]: id });
                return res.deletedCount > 0;
            } catch (r) {
                console.error(`Error deleting data for ${primaryKey}:`, r);
                return false;
            }
        },
        getAll: async () => {
            try {
                if (isSequelize) {
                    return await model.findAll();
                }
                return await model.find({});
            } catch (a) {
                console.error("Error getting all data:", a);
                return [];
            }
        }
    };
}
