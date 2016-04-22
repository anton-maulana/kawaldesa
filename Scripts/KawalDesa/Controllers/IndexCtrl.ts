﻿/// <reference path="../../typings/angularjs/angular.d.ts"/>
/// <reference path="../../gen/Models.ts"/>
/// <reference path="../../gen/Controllers.ts"/>
/// <reference path="../KawalDesa.ts"/>


module App.Controllers {

    function safeApply(scope, fn) {
        (scope.$$phase || scope.$root.$$phase) ? fn() : scope.$apply(fn);
    }

    export interface ICurrentUser {
        Id: string;
        FacebookId: String;
        Name: String;
        fkOrganizationId: number;
        Roles: string[];
        Scopes: string[];
    }

    interface MyWindow extends Window {
        CurrentUser: ICurrentUser;
        Data?: any;
    }

    declare var window: MyWindow;

    import Models = App.Models;
    import Controllers = App.Controllers.Models;

    var CHILD_NAMES = [
        "Daerah",
        "Provinsi",
        "Kabupaten / Kota",
        "Kecamatan",
        "Desa",
        "Tanggal",
    ];

    /* a route is a [prefix, type, useRegionId]
     *  prefix: the url prefix, 
     *  type: the indexCtrl type if this route matches, 
     *  useRegionId: whether the rout param use region id
     */
    var ROUTES : any[][] = [
        ["/dd/", "dd", true],
        ["/add/", "add", true],
        ["/bhpr/", "bhpr", true],
        ["/p/", "transfer", true],
        ["/r/", "realization", true],
        ["/dashboard", "dashboard", false],
        ["/orgs", "orgs", false],
        ["/u/", "users", false],
        ["/login", "login", false],
        
    ];

    export class IndexCtrl {
        years: any[] = [
            { year: "2015", apbn: "2015p" },
            { year: "2016", apbn: "2016p" }
        ];
        yearSelected: any = this.years[0];

        region: Models.Region;
        regionId: string;
        regionTree: Models.Region[];

        type = "transfer";
        isPathReplacing = false;
        currentPath : string = null;

        childName: string;
        guessedRegionType: number;

        currentUser: ICurrentUser;
        data: any;

        static $inject = ["$scope", "$location", "$modal", "$document"];

        constructor(public $scope, public $location: ng.ILocationService, public $modal, public $document) {
            $scope.App = App;
            var ctrl = this;
            var scope = this.$scope;
            this.currentUser = window.CurrentUser;
            this.data = window.Data;
            var pathSplit: any[] = this.$location.path().split("/");
            this.years.forEach(u=> {
                if (u.year == pathSplit[1]) this.yearSelected = u;
            });

            /* Path replacing occurs when there is a redirection, e.g /r/21121212 to /mandalmekar */
            if(!ctrl.isPathReplacing)
                ctrl.onLocationChange();
            ctrl.isPathReplacing = false;
            
            $scope.$on('$locationChangeSuccess', function () {
                ctrl.defaultYear();
                if(!ctrl.isPathReplacing)
                    ctrl.onLocationChange();
                ctrl.isPathReplacing = false;
            });

            //dropdowns
            $document.bind('click', function () {
                var dropdownStatusVars = ["navOpen", "navUserOpen"];
                for (var i = 0; i < dropdownStatusVars.length; i++) {
                    var ddVar = dropdownStatusVars[i];
                    if (ctrl.$scope[ddVar]) {
                        $scope.$apply(() => {
                            ctrl.$scope[ddVar] = false;
                        });
                    }
                }
            });
        }

        onLocationChange(): void {
            var pathSplit: any[] = this.$location.path().split("/");
            var path = this.$location.path();
            if (path == this.currentPath)
                return;

            var pathYear = '/' + this.yearSelected.year + '/';
            var regionId:string = null;

            var regionKey = null;
            var pathJoin: any[] = path.split('/');

            var matched: any[] = ROUTES.filter(r => path.indexOf(r[0]) == 0);
            
            this.type = null;

            if (path == "/" || path == "" || path == pathYear) {

                regionId = "0";
                this.type = "transfer";
            } else {
                var matched: any[] = ROUTES.filter(r => path.indexOf(r[0]) == 0);
                pathSplit.splice(1, 1);
                var join = pathSplit.join("/");
                if (matched.length == 0) {
                    matched = ROUTES.filter(r => join.indexOf(r[0]) == 0);
                    var x = 1
                }
                if (matched[0]) {
                    this.type = matched[0][1];
                    if (matched[0][2]) {
                        if (x == 1)
                            regionId = join.replace(matched[0][0], "");
                        else
                            regionId = path.replace(matched[0][0], "");

                        if (regionId.indexOf("/") != -1) {
                            regionId = regionId.substr(0, regionId.indexOf("/"));
                        }

                    }
                }
            }

            this.guessedRegionType = this.guessType(regionId);

            var ctrl = this;
            if (regionId != null || regionKey) {
                setTimeout(() => {
                    ctrl.$scope.$apply(() => {
                        this.$scope.$broadcast("regionChangeBefore");
                    });
                }, 0);
            }
            if (regionId == null && !regionKey)
                regionId = "0";

            this.regionId = regionId;
            this.currentPath = path;
        }

        guessType(regionId: string): number {
            if (regionId == "0")
                return 0;
            if (!regionId)
                return null;
            return (regionId.match(/\./g) || []).length + 1;
        }

        changeType(type: string, $event): void {

            for (var i = 0, len = ROUTES.length; i < len; i++) {
                var route = ROUTES[i];
                var useRegionId = route[2];
                var routeType = route[1];
                if (this.type == routeType && !useRegionId) {
                    return;
                }
            }

            if (this.type != 'dashboard') {
                $event.preventDefault();
                var matched: any[] = ROUTES.filter(r => r[1] == type);
                var regionId = this.region.Id;
                var path

                //desa only allowed on transfer & realization
                if (this.region.Type == 4 && (type != "transfer" && type != "realization")) {
                    regionId = this.region.fkParentId;
                }
                //realization only allow national and desa
                if (type == "realization" && (this.region.Type != 0 || this.region.Type != 4)) {
                    regionId = "0";
                    this.regionTree = [];
                }
                if (this.yearSelected.year == '2015') {
                    path = matched[0][0] + regionId;
                } else {
                    path = this.yearSelected.year + matched[0][0] + regionId
                }
                
                this.$location.path(path);
            }
        }

        changeRegion(regionId: string, $event): void {
            if ($event) {
                $event.preventDefault();
            }
            var path = this.$location.path();
            var yearSelected = this.yearSelected.year;
            var newPath = null;
            var type = this.type;
            var matched: any[] = ROUTES.filter(r => r[1] == type);
            if (this.yearSelected.year == '2015') {
                var path = matched[0][0] + regionId;
            } else {
                var path = this.yearSelected.year + matched[0][0] + regionId;
            }
            this.$location.path(path);
        }

        changeYear(type: string, regionId: string) {
            var newPath = null;
            var path = this.$location.path();
            var matched: any[] = ROUTES.filter(u => u[1] == type);

            if (this.yearSelected.year == '2015') {
                    newPath = matched[0][0] + regionId;
            } else {
                    newPath = this.yearSelected.year + matched[0][0] + regionId;
            }
            this.$location.path(newPath);
        }

        defaultYear() {
            var pathSplit: any[] = this.$location.path().split("/");
            this.years.forEach(u=> {
                if (u.year == pathSplit[1]) {
                    this.yearSelected = u;
                }
            });

        }

        oloadRegion(parentId?: string, parentKey?: string) {
        }

        loadRegion(region: Models.Region) {
            var ctrl = this;

            this.regionTree = [];
            this.childName = CHILD_NAMES[0];

            ctrl.region = region;
            ctrl.regionId = region.Id;

            ctrl.initSourceUploadDefaults();

            var regionTree = [];
            var cur : Models.IRegion = region;
            while (cur) {
                regionTree.push(cur);
                cur = cur.Parent;
            }
            ctrl.regionTree = regionTree.reverse();
            if (regionTree.length < CHILD_NAMES.length)
                ctrl.childName = CHILD_NAMES[regionTree.length];

            //scoped child name fix
            if (ctrl.currentUser == null && region.Id == "0")
                ctrl.childName = CHILD_NAMES[2];

            if (region.UrlKey && ctrl.$location.path() != "/" + region.UrlKey) {
                ctrl.isPathReplacing = true;
                ctrl.$location.path("/" + region.UrlKey);
                ctrl.$location.replace();
            }

        }

        /* UI Utils */

        modalInstance: any;

        modal(template: string, $scope?, backdrop?): void {
            if (!backdrop)
                backdrop = true;
            var ctrl = this;
            ctrl.modalInstance = this.$modal.open({
                templateUrl: template,
                scope: $scope ? $scope : this.$scope,
                backdrop: backdrop
            });
        }

        closeModal(): void {
            if (this.modalInstance) {
                this.modalInstance.close();
                this.modalInstance = null;
            }
        }

        getBarPercent(value: number, fullValue: number): {} {
            var percent = value * 100 / fullValue;
            return { "width": percent + "%" };
        }


        /* Security Utils */

        isInRole(roleName: string): boolean {
            if (!this.currentUser) {
                return false;
            }
            return this.currentUser.Roles.some(r => roleName == r);
        }

        isInScope(entityId: string): boolean {
            var regionId = this.regionTree.map(r => r.Id);
            regionId.push(entityId);
            return regionId.some(rid => this.currentUser.Scopes.some(id => rid == id));
        }

        isInRoleAndScope(roleName: string, entityId: string): boolean {
            return this.isInRole(roleName) && this.isInScope(entityId);
        }

        hasAnyVolunteerRoles(): boolean {
            return this.currentUser != null
                && this.currentUser.Roles.some(r => r.indexOf("volunteer_") != -1);
        }


        /* Google Sheet */

        isLoadingUrl = false;

        openGoogleSheet() : void {
            if (this.isLoadingUrl)
                return;
            var ctrl = this;
            this.isLoadingUrl = true;
            Controllers.SpreadsheetController
                .GetCurrentSheetUrl(this.activeUploadType, this.activeUploadRegionId, this.yearSelected.apbn)
                .then(url => {
                    ctrl.isLoadingUrl = false;
                    window.open(url.data, "_blank");
                });
        }


        /* Search */

        showSearch($event): void {
            $event.preventDefault();
            this.$scope.searchShown = true;
            setTimeout(function () {
                $(".search-input-group input").focus();
                $(".search-input-group input").select();
            }, 0);
        }

        searchRegions(keyword, scopeToFunction?) : any {
            var query = { "keyword": keyword };
            if (scopeToFunction)
                query["function"]= this.newSourceFunction;
            return Controllers.RegionSearchResultController.GetAll(query)
                .then((regions) => regions.data);
        }

        onSearchSelected(item, model) : void {
            var type = this.type;
            var regionId = model.Type == 4 && type !== 'transfer' ? model.ParentId : model.Id;
            var matched : any[] = ROUTES.filter(r => r[1] == type);
            var path = "/p/" + regionId;
            if (!matched[2])
                window.open(path, "_self"); //just open the url
            else
                path = matched[0][0] + regionId;
                this.$location.path(path);
        }


        /* Upload */

        activeUploadType: App.Models.DocumentUploadType;
        activeUploadRegionId: string;
        activeUpload: App.Models.Spreadsheet;

        activeSources:  App.Models.SourceDocument[];
        newSourceFile: any;
        newSourceSubType: string;
        newSourceDate: Date;
        newSourceAmount: number;
        newSourceFunction: App.Models.SourceDocumentFunction;
        newSourceRegion: any;
        newSourceErrors= {};
        newSourceState = false;

        configureDocumentUpload(type: App.Models.DocumentUploadType, regionId: string) : void {
            this.activeUploadType = type;
            this.activeUploadRegionId = regionId;
            var ctrl = this;
            ctrl.activeUpload = null;
            Controllers.SpreadsheetController
                .GetActive(type, regionId, this.yearSelected.apbn)
                .then(doc => {
                    ctrl.activeUpload = doc.data;
                    Controllers.SourceDocumentController
                        .GetAll({ "fkRegionId": regionId, "type": type, "apbnKey": this.yearSelected.apbn })
                        .then(sources => {
                            ctrl.activeSources = sources.data;
                    });
            });
        }

        initSourceUploadDefaults() : void {
            var ctrl = this;
            var region = ctrl.region;

            ctrl.newSourceFunction = ctrl.type == "transfer"
                ? Models.SourceDocumentFunction.Transfer
                : Models.SourceDocumentFunction.Allocation;

            ctrl.newSourceRegion = region;
            if (ctrl.newSourceFunction == Models.SourceDocumentFunction.Allocation) {
                if (region.Type == 1 || region.Type == 3)
                    ctrl.newSourceRegion = region.Parent;
                if (region.Type == 4)
                    ctrl.newSourceRegion = region.Parent.Parent;
            } else {
                if (region.Type != 4)
                    ctrl.newSourceRegion = null;
            }

            if (ctrl.type == "dd")
                ctrl.newSourceSubType = "Dd";
            if (ctrl.type == "add")
                ctrl.newSourceSubType = "Add";
            if (ctrl.type == "bhpr")
                ctrl.newSourceSubType = "Bhpr";
        }

        uploadSource() : void {

            var errors = this.newSourceErrors = {};
            if (this.newSourceRegion == null) {
                if (this.newSourceFunction == Models.SourceDocumentFunction.Allocation)
                    errors["fkRegionId"] = "Pilih wilayah alokasi dana, pilih 'Nasional' untuk alokasi nasional.";
                else
                    errors["fkRegionId"] = "Pilih desa di mana dana ini tersalurkan.";
            }

            if (this.newSourceSubType == null) {
                errors["Type"] = "Pilih jenis dana yang ingin anda unggah";
            }

            if (this.newSourceFunction == Models.SourceDocumentFunction.Transfer && !this.newSourceAmount) {
                errors["Amount"] = "Isi jumlah penyaluran dana desa";
            }
            if (this.newSourceFunction == Models.SourceDocumentFunction.Transfer && !this.newSourceDate) {
                errors["Date"] = "Pilih tanggal penyaluran dana desa";
            }
            if (this.newSourceFunction == Models.SourceDocumentFunction.Allocation && (!this.newSourceFile || this.newSourceFile.length == 0)) {
                errors["File"] = "Pilih dokumen yang ingin anda unggah";
            }

            if (!jQuery.isEmptyObject(errors)) {
                return;
            }

            var typeStr = this.newSourceRegion.Id == "0" ? "National" : "Regional";
            typeStr = typeStr + this.newSourceSubType;
            var type = Models.DocumentUploadType[typeStr];
            var fn = this.newSourceFunction;

            var ctrl = this;
            var multipart = new Microvac.Web.Multipart({ files: this.newSourceFile });
          
            if (fn == Models.SourceDocumentFunction.Transfer) {
                var form = new Models.Transfer();
                var date = ctrl.newSourceDate;
                function pad(i) {
                    var result = i + "";
                    if (result.length == 1)
                        result = "0" + result;
                    return result;
                }
                form.Date = date.getFullYear() + "-"
                + pad(date.getMonth() + 1) + "-"
                + pad(date.getDate()) + "T00:00:00";
                if (this.newSourceSubType == "Dd")
                    form.Dd = this.newSourceAmount;
                else if (this.newSourceSubType == "Add")
                    form.Add = this.newSourceAmount;
                else if (this.newSourceSubType == "Bhpr")
                    form.Bhpr = this.newSourceAmount;
                multipart["forms"] = form;
            }


            ctrl.newSourceState = true;
            Controllers.SourceDocumentController
                .Upload(multipart, type, fn, this.newSourceRegion.Id, this.yearSelected.apbn)
                .success(() => {
                    safeApply(ctrl.$scope, () => {
                        ctrl.closeModal();
                        if (fn == Models.SourceDocumentFunction.Allocation) {
                            ctrl.configureDocumentUpload(ctrl.activeUploadType, ctrl.activeUploadRegionId);
                        } else {
                            location.reload();
                        }
                    });
                }).finally(() => {
                    safeApply(ctrl.$scope, () => {
                        ctrl.newSourceState = false;
                });
            });;
        }

    }

    kawaldesa.controller("IndexCtrl", IndexCtrl);
}