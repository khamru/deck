'use strict';

let angular = require('angular');

module.exports = angular
  .module('spinnaker.loadBalancer.read.service', [
    require('../naming/naming.service.js'),
    require('../caches/infrastructureCaches.js'),
    require('./loadBalancer.transformer.js'),
  ])
  .factory('loadBalancerReader', function ($q, Restangular, searchService, namingService,
                                           loadBalancerTransformer, infrastructureCaches) {

    function loadLoadBalancers(applicationName) {
      var loadBalancers = Restangular.one('applications', applicationName).all('loadBalancers').getList();
        return loadBalancers.then(function(results) {
          results.forEach(addStackToLoadBalancer);
          return $q.all(results.map(loadBalancerTransformer.normalizeLoadBalancer));
        });
    }

    function addStackToLoadBalancer(loadBalancer) {
      var nameParts = namingService.parseLoadBalancerName(loadBalancer.name);
      loadBalancer.stack = nameParts.stack;
    }

    function getLoadBalancerDetails(provider, account, region, name) {
      return Restangular.one('loadBalancers').one(account).one(region).one(name).get({'provider': provider});
    }

    function listAWSLoadBalancers() {
      return Restangular
        .all('loadBalancers')
        .withHttpConfig({cache: infrastructureCaches.loadBalancers})
        .getList({provider: 'aws'});
    }

    function listGCELoadBalancers() {
      return Restangular
        .all('loadBalancers')
        .withHttpConfig({cache: infrastructureCaches.loadBalancers})
        .getList({provider: 'gce'});
    }

    return {
      loadLoadBalancers: loadLoadBalancers,
      getLoadBalancerDetails: getLoadBalancerDetails,
      listAWSLoadBalancers: listAWSLoadBalancers,
      listGCELoadBalancers: listGCELoadBalancers
    };

  })
  .name;
