var db = require('../../etl-db');
const { v4: uuidv4 } = require('uuid');

var defs = {
  CreateDrugOrder: (params) => {
    return new Promise((resolve, reject) => {
      let queryParts = {};
      let sql =
        'select location_id,name,description,uuid from amrs.location where location_id in (select parent_location from amrs.location where location_id in (select location_id from amrs.location_attribute where attribute_type_id = 1 and voided = 0) and parent_location is not null and retired != 1 group by parent_location having count(parent_location) > 1) ';
      queryParts = {
        sql: sql
      };
      return db.queryServer(queryParts, function (result) {
        result.sql = sql;
        resolve(params);
        // resolve(result.result);
      });
    });
  },
  CreateDrugOrderTracker: (params) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO etl.drug_order_tracker 
        (drug_order_tracker_id, order_id, status, clinic_location_id, pharmacy_location_id, current_location, created_on) 
        VALUES 
        (${params.drug_order_tracker_id}, ${params.order_id}, ${params.status}, ${params.clinic_location_id}, ${params.pharmacy_location_id}, b'${params.current_location}', current_timestamp())
      `;

      const queryParts = { sql: query };

      db.queryServer(queryParts, (result) => {
        result.sql = query;
        resolve({ params, result: result.result });
      });
    });
  },
  getDrugOrder: (params) => {
    return new Promise((resolve, reject) => {
      let queryParts = {};
      let sql =
        'select location_id,name,description,uuid from amrs.location where location_id in (select parent_location from amrs.location where location_id in (select location_id from amrs.location_attribute where attribute_type_id = 1 and voided = 0) and parent_location is not null and retired != 1 group by parent_location having count(parent_location) > 1) ';
      queryParts = {
        sql: sql
      };
      return db.queryServer(queryParts, function (result) {
        result.sql = sql;
        resolve(params);
        // resolve(result.result);
      });
    });
  },
  getPharmacyFacilities: () => {
    return new Promise((resolve, reject) => {
      let queryParts = {};
      let sql =
        'SELECT facility_mapper_id, location_id, mfl_code, location_name, is_pharmacy, ip_address, created_on, created_by FROM etl.facility_mapper';
      queryParts = {
        sql: sql
      };
      return db.queryServer(queryParts, function (result) {
        result.sql = sql;
        resolve(result.result);
      });
    });
  }
};

module.exports = defs;
