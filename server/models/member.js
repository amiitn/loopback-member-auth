var app = require('../../server/server');
var async = require('async');
var _ = require('lodash');

'use strict';

module.exports = function(Member) {

    /**
     * Remote hook to change accessToken response after login remote method has finished successfully  
     */
    Member.afterRemote('login', function(context, accessToken, next) {
        
        // Find member by id with roles
        Member.findById(accessToken.userId,{'include':'roles'},function(err,member){

            if (err) {
                return next(err);
            }

            // add member information to accessToken object
            accessToken['member'] = member;

            context.result = accessToken;
            next();
        });
    });


   
    /**
     * Find member by email or id
     * @param {string} email Member email
     * @param {string} id  Member id
     * @param {Function} cb Callback function 
     */
    function findByEmailOrId(email,id,cb) {
        //query object for querying data
        var query = {where:{},include:'roles'};

        // prepare query
        if(email !== null && id !== null){
            query.where = {and: [{email: email}, {id: id}]};
        }else if(email !== null){
            query.where = {email: email};
        }else{
            query.where = {id: id};
        }

        // Find member by query
        Member.findOne(query, function(err, member) {
            if (err) return cb(err);

            if(_.isEmpty(member)){
                var error = new Error(`Member was not found`);
                error.statusCode = 400;
                return cb(error);
            }
       
            cb(null, member);
        });
        
    }

  
    /**
     * Find Admin role
     * @param {Function} cb Callback function 
     */
    function findAdminRole(cb) {
        
        var Role = app.models.Role;
        Role.findOne({where: {name:'Admin'}}, function(err, role) {
            if (err) return cb(err);

            if(_.isEmpty(role)){
                var error = new Error(`Admin role was not found`);
                error.statusCode = 400;
                return cb(error);
            }

            cb(null, role);
        });
        
    }

    /**
     * Assign Admin role to member 
     * @param {object} member Member object
     * @param {object} role Role object
     * @param {Function} cb Callback function 
     */
    function assignRoleToMember(member,role,cb){

        var RoleMapping = app.models.RoleMapping;
        RoleMapping.findOne({ where: { principalId: member.id, roleId: role.id } }, function(err, roleMapping) { // Find the role mapping...
            if (err) cb(err); // Error

            // Check already exists or not to avoid duplicate entry
            if (_.isEmpty(roleMapping)) { 
                role.principals.create({
                    principalType: RoleMapping.USER,
                    principalId: member.id
                }, cb);
            } else {
                // Error of already assigned role to the member 
                var error = new Error(`${role.name} role is already assigned to the ${member.email}`);
                error.statusCode = 400;
                cb(error);                
            }
        });
        
    }

        
 
    /**
     * makeAdmin remote method function
     * @param {string} email Member email
     * @param {string} member_id Member id
     */
    Member.makeAdmin = function(email=null, member_id=null, cb) {

        if(email === null && member_id === null){
            err = new Error('Either member email or member id is required');
            err.statusCode = 400;
            return cb(err);
        }

        async.parallel({  
            member: async.apply(findByEmailOrId,email,member_id),
            role: async.apply(findAdminRole),
        }, function(err, results) {
            if (err){
                if(err.statusCode === 400){
                    return cb(err);
                }
                throw err;
            }

            let member = results.member;
            let adminRole = results.role;

            assignRoleToMember(member, adminRole, function(err) {
                if (err) return cb(err);

                cb(null, `${adminRole.name} role successfully assigned to the ${member.email}`);
                console.log(` > ${adminRole.name} role successfully assigned to the ${member.email}`);

            });
        });
    };

    /**
     * Register makeAdmin remote method
     */
    Member.remoteMethod(
        'makeAdmin', {
            http: {
                path: '/makeAdmin',
                verb: 'post',
            },
            accepts: [
                {arg: 'email', type: 'string'},
                {arg: 'member_id',  type: 'string'}
            ],
            returns: {
                arg: 'message',
                type: 'string',
            },
        }
    );
};
