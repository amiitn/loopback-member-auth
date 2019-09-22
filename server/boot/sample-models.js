// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: loopback-example-access-control
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

var async = require('async');

module.exports = function(app) {
  //data source
  var mongoDs = app.dataSources.mongoDs;

  async.parallel({  
    member: async.apply(createMember),
    roles: async.apply(createDefaultRoles),
  }, function(err, results) {
    if (err) throw err;

    let superAdminRole = results.roles[0]; // get SuperAdmin role from created default roles
    let defaultMember =  results.member;
    assignRoleToMember(defaultMember, superAdminRole, function(err) {
      console.log('> default SuperAdmin member created sucessfully');
    });
  });

  /**
   * Create default member
   * @param {Function} cb Callback function
   */
  function createMember(cb) {
    mongoDs.automigrate('Member', function(err) {
      if (err) return cb(err);
      var Member = app.models.Member;
      Member.create({
        username: 'amit', 
        email: 'amit@orbo.ai', 
        password: 'amit'
      }, cb);
    });
  }


  /**
   * Create default roles `SuperAdmin` and `Admin`
   * @param {Function} cb Callback function
   */
  function createDefaultRoles(cb) {
    mongoDs.automigrate('Role', function(err) {
      if (err) return cb(err);
      var Role = app.models.Role;
      Role.create([{name: 'SuperAdmin'},{name: 'Admin'}], cb);
    });
  }

  /**
   * Assign SuperAdmin role to member 
   * @param {object} member Member object
   * @param {object} role Role object
   * @param {Function} cb Callback function 
   */
  function assignRoleToMember(member,role,cb){
    mongoDs.automigrate('RoleMapping', function(err) {
      if (err) return cb(err);
      var RoleMapping = app.models.RoleMapping;
      role.principals.create({
        principalType: RoleMapping.USER,
        principalId: member.id
      }, cb);
    });
  }
  
};