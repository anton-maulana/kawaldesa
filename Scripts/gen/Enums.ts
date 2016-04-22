﻿/// WARNING: T4 generated file 

module App.Models {

    export enum AccountType {
        INCOME_2,
        INCOME = 0,
        EXPENSE = 1,
    }
    
    export enum DocumentUploadType {
        NationalDd,
        RegionalDd,
        NationalAdd,
        RegionalAdd,
        NationalBhpr,
        RegionalBhpr,
        DdTransfer,
        AddTransfer,
        BhprTransfer,
    }
    
    export enum ExpenseGroup {
        Employee = 0,
        GoodsAndServices,
        Capital,
        Others = 99,
    }
    
    export enum ExpenseType {
        Direct = 0,
        Indirect,
    }
    
    export enum RegionType {
        NASIONAL = 0,
        PROPINSI,
        KABUPATEN,
        KECAMATAN,
        DESA,
    }
    
    export enum Sector {
        Infrastructure = 0,
        Education,
        Agriculture,
        Healthcare,
        Maritime,
        Energy,
        Others = 99,
    }
    
    export enum SourceDocumentFunction {
        Allocation,
        Transfer,
    }
    
}
module App.Models.Views {

}
