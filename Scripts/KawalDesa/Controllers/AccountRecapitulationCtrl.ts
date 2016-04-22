/// <reference path="../../typings/angularjs/angular.d.ts"/>
/// <reference path="../../gen/Models.ts"/>
/// <reference path="../../gen/Controllers.ts"/>
/// <reference path="IndexCtrl.ts"/>
/// <reference path="../KawalDesa.ts"/>


module App.Controllers {

    import Models = App.Models;
    import Controllers = App.Controllers.Models;

    var typeDict = {
        "i": Models.AccountType.INCOME,
        "e": Models.AccountType.EXPENSE
    }
    
    class AccountRecapitulationCtrl {

        static $inject = ["$scope", "$upload"];

        indexCtrl: IndexCtrl;
        accounts: Models.Account[];
        isShowingDetail: boolean = false;
        typeBudget: string = null;
        

        constructor(public $scope, public $upload) {
            var ctrl = this;
            this.indexCtrl = this.$scope.indexCtrl;
            
            $scope.$on('regionChangeBefore', function () {
                var path = ctrl.indexCtrl.$location.path();
                
                var removed = path.replace("/r/" + ctrl.indexCtrl.regionId, "");
                var type = null;
                if (removed != "") {
                    removed = removed.substr(1);
                    type = typeDict[removed];
                }
                ctrl.getRecapitulations(ctrl.indexCtrl.regionId, type);
            });           
        }

        getRecapitulations(regionId: string, type: Models.AccountType) {
            var ctrl = this;
            var scope = this.$scope;
            scope.isEntitiesLoading = true;

            if (type == null) {
                ctrl.isShowingDetail = false;
                var scope = this.$scope;
                Controllers.AccountRecapitulationController.GetAll().then(result => {
                    scope.entities = result.data;
                });
                return;
            } else {
                ctrl.isShowingDetail = true;
                scope.details = [];
                if (type == 0) {
                    ctrl.typeBudget= "pendapatan";
                } else {
                    ctrl.typeBudget = "belanja";
                }
                Controllers.AccountController.GetAccountsByRegion(regionId, type).then(result => {
                    scope.details = result.data;
                }).finally(() => {
                    scope.isEntitiesLoading = false;
                });
            }
        }

        selectRecapitulations(regionId: string, type: string, $event): void {
            if ($event) {
                $event.preventDefault();
            }

            var path = "/r/" + regionId + "/" + type;
            this.indexCtrl.$location.path(path);
        }


    }
    kawaldesa.controller("AccountRecapitulationCtrl", AccountRecapitulationCtrl);   
}



    