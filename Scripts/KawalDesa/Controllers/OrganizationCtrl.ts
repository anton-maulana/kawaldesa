/// <reference path="../../typings/angularjs/angular.d.ts"/>
/// <reference path="../../gen/Models.ts"/>
/// <reference path="../../gen/Controllers.ts"/>

module App.Controllers {
    import Models = App.Models;
    import Controllers = App.Controllers.Models;

    
    function safeApply(scope, fn) {
        (scope.$$phase || scope.$root.$$phase) ? fn() : scope.$apply(fn);
    }

    class OrganizationCtrl {

        indexCtrl: IndexCtrl;

        static $inject = ["$scope"];
        
        organizations: Models.Organization[];
        selected: Models.Organization = null;
        picture: any;
        
        volunteerRoles: {} = {
            "volunteer_transfer": " P ",
            "volunteer_allocation": " A ",
            "volunteer_realization": " R "
        };

        newOrganizationName: string;
        newOrganizationVolunteerEmail: string;
        newOrganizationAdminEmail: string;
        
        orgAdmins: Models.UserViewModel[] = null;
        orgVolunteers: Models.UserViewModel[] = null;
        orgUploads: Models.Spreadsheet[] = null;
        viewVolunteers: Models.UserViewModel[] = null;

        regionAvailable: Models.Region[];

        regions: Models.Region[];
        volunteerRegions: Models.Region[];
        regionPairs: Models.Region[][] = [];
        scope: Models.Region[];
        

        savingStates = {};
        errors = {};


        constructor(public $scope) {
            var ctrl = this;
            this.indexCtrl = $scope.indexCtrl;

            var orgId = parseInt(this.indexCtrl.$location.path().replace("/orgs/", ""));

            this.savingStates["page"] = true;
            Controllers.OrganizationController.GetAll().then(orgs => {
                this.savingStates["page"] = false;
                ctrl.organizations = orgs.data;
                if (orgId > 0) {
                    ctrl.selected = this.organizations.filter(o => o.Id == orgId)[0];
                    ctrl.loadOrganization();
                    ctrl.getVolunteerRegion(1);
                }
            });
        }

        isEditable() {
            if (this.indexCtrl.isInRole("admin"))
                return true;
            if (this.indexCtrl.isInRole("org_admin"))
                return this.indexCtrl.currentUser.fkOrganizationId == this.selected.Id;
            return false
        }

        loadOrganization() {
            var ctrl = this;
            ctrl.orgAdmins = ctrl.orgVolunteers = ctrl.volunteerRegions = null;

            Services.UserController.GetAllByOrg(this.selected.Id).then(users => {
                ctrl.orgAdmins = users.data.filter(u => u.Roles.filter(r => r == 'org_admin').length > 0);
                ctrl.orgVolunteers = users.data.filter(u => u.Roles.filter(r => r == 'org_admin').length == 0);
            })
            
            ctrl.orgUploads = null;
            Controllers.SpreadsheetController.GetAll({ "fkOrganizationId": this.selected.Id }).then(uploads => {
                ctrl.orgUploads = uploads.data;
            })
        }

        select(id: number) {
            
            this.selected = this.organizations.filter(o => o.Id == id)[0];
        }

        saveOrganization() {
            var ctrl = this;
            this.savingStates["org"] = true;
            var multipart = new Microvac.Web.Multipart({
                forms: this.selected,
                files: this.picture
            });
            Controllers.OrganizationController.Update(multipart).success(() => {
                ctrl.indexCtrl.closeModal();
            }).then(() => {
                ctrl.$scope.$apply(() => {
                    ctrl.savingStates["org"] = false;
                });
            });
        }

        saveNewOrganization() {
            var ctrl = this;
            this.savingStates["new-org"] = true;
            var org = new Models.Organization();
            org.Name = this.newOrganizationName;
            Controllers.OrganizationController.Save(org).then(() => {
                ctrl.organizations.push(org);
                ctrl.indexCtrl.closeModal();
            }).finally(() => {
                ctrl.savingStates["new-org"] = false;
            });
        }

        saveNewOrganizationAdmin() {
            var ctrl = this;
            this.savingStates["new-admin"] = true;
            this.errors["new-admin"] = null;
            Controllers.OrganizationController
                .AddOrgAdmin(this.selected.Id, this.newOrganizationAdminEmail)
                .then(user => {
                    ctrl.orgAdmins.push(user.data);
                    ctrl.indexCtrl.closeModal();
                }).catch(err => {
                    var msg = err.data.ExceptionMessage;
                    ctrl.errors["new-admin"] = msg;
                }).finally(() => {
                    ctrl.savingStates["new-admin"] = false;
            });
        }

        saveNewOrganizationVolunteer() {
            var ctrl = this;
            this.savingStates["new-volunteer"] = true;
            this.errors["new-volunteer"] = null;
            Controllers.OrganizationController
                .AddOrgVolunteer(this.selected.Id, this.newOrganizationVolunteerEmail)
                .then(user => {
                    ctrl.orgVolunteers.push(user.data);
                    ctrl.indexCtrl.closeModal();
                }).catch(err => {
                    var msg = err.data.ExceptionMessage;
                    ctrl.errors["new-volunteer"] = msg;
                }).finally(() => {
                    ctrl.savingStates["new-volunteer"] = false;
            });
        }
                
        saveIsActive(id: string, isActive: boolean) {
            var ctrl = this;
            Services.UserController.SetIsActive(id, isActive);
            ctrl.indexCtrl.closeModal();
            return ctrl.loadOrganization(), ctrl.getVolunteerRegion(1);
            
        }

        getVolunteerRegion(type: number) {
            var ctrl = this;
            var key = [], keys = [], tempRegion = [];
            this.regionAvailable = [];

            Services.UserController.GetAllByOrg(this.selected.Id).then(users => {
                ctrl.viewVolunteers = users.data.filter(u => u.Roles.filter(r => r == 'org_admin').length == 0);
                
                for (var n = 0; n < ctrl.viewVolunteers.length; n++){
                    ctrl.scope = ctrl.viewVolunteers[n].Scopes;
                    
                    for (var i = 0; i < ctrl.scope.length; i++) {
                        var regionPair = [null, null, null, null, null];
                        var current = ctrl.scope[i];
                        while (current) {
                            regionPair[current.Type] = current;
                            current = current.Parent;
                        }
                        tempRegion.push(regionPair[type]);
                    }
                }


                tempRegion.forEach( item => {
                    var key = item['Id'];

                    if (keys.indexOf(key) === -1) {
                        keys.push(key);
                        ctrl.regionAvailable.push(item);
                    }
                })
            })
        }
    }
    kawaldesa.controller("OrganizationCtrl",  OrganizationCtrl);
}