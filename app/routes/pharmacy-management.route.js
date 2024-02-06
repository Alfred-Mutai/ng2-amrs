var authorizer = require('../../authorization/etl-authorizer');
var privileges = authorizer.getAllPrivileges();
var pharmacymanagement = require('../pharmacy-management/pharmacy-management');

const routes = [
  {
    // method: 'POST',
    // path: '/etl/create-drug-order',
    // handler: (request, h) => {
    //   try {
    //     const payload = request.payload;

    //     console.log("mike test ", JSON.stringify(payload))

    //     // Access the parameters
    //     const type = payload.type;
    //     const action = payload.action;
    //     const orderer = payload.orderer;
    //     const patient = payload.patient;
    //     const careSetting = payload.careSetting;
    //     const drugOrders = payload.drugOrders;

    //     // Accessing drug order details
    //     const drugOrder = drugOrders[0];
    //     const concept = drugOrder.concept;
    //     const dosingType = drugOrder.dosingType;
    //     const orderReason = drugOrder.orderReason;
    //     // ... and so on

    //     // Your business logic here

    //     return { success: true, message: 'Data received successfully' };
    //   } catch (error) {
    //     return { success: false, message: 'Error processing request' };
    //   }
    // }

    method: 'POST',
    path: '/etl/create-drug-order',
    config: {
      plugins: {},
      handler: function (request, reply) {
        pharmacymanagement
          .CreateDrugOrder(request.payload)
          .then((result) => {
            reply(result);
          })
          .catch((error) => {
            reply(error);
          });
      },
      description: 'List of facilities with MFL code',
      notes: 'Returns facilities list',
      tags: ['api'],
      validate: {
        options: {
          allowUnknown: true
        },
        params: {}
      }
    }
  },
  {
    method: 'GET',
    path: '/etl/create-drug-tracker',
    config: {
      plugins: {},
      handler: function (request, reply) {
        pharmacymanagement
          .CreateDrugOrderTracker()
          .then((result) => {
            reply(result);
          })
          .catch((error) => {
            reply(error);
          });
      },
      description: 'List of facilities with MFL code',
      notes: 'Returns facilities list',
      tags: ['api'],
      validate: {
        options: {
          allowUnknown: true
        },
        params: {}
      }
    }
  },
  {
    method: 'POST',
    path: '/etl/facilities-for-pharmacy',
    config: {
      plugins: {},
      handler: function (request, reply) {
        pharmacymanagement
          .getPharmacyFacilities()
          .then((result) => {
            reply(result);
          })
          .catch((error) => {
            reply(error);
          });
      },
      description: 'List of facilities with MFL code',
      notes: 'Returns facilities list',
      tags: ['api'],
      validate: {
        options: {
          allowUnknown: true
        },
        params: {}
      }
    }
  }
];

exports.routes = (server) => server.route(routes);
