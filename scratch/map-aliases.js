const fs = require('fs');

const insts = require('../data/processed/institutes.json');

const aliasConfig = [
    { code: '700310', search: 'Seth GS Medical College' },
    { code: '700329', search: 'BRD Medical College, Gorakhpur' },
    { code: '700388', search: 'Burdwan Medical College, Burdwan' },
    { code: '701512', search: 'Chamrajanagar Institute' },
    { code: '700308', search: 'Dr SN Medical College, Jodhpur' },
    { code: '700292', search: 'Dr B Borooah Cancer' },
    { code: '700302', search: 'Dr Vaishampayan Memorial Medical College, Solapur' },
    { code: '700361', search: 'GSVM Medical College, Kanpur' },
    { code: '700283', search: 'Gauhati Medical College' },
    { code: '902838', search: 'Government Medical College, Shivpuri' },
    { code: '700291', search: 'Medical College, Thiruvananthapuram' },
    { code: '700386', search: 'Government Medical College, Haldwani' },
    { code: '700379', search: 'Indira Gandhi Medical College, Shimla' },
    { code: '700323', search: 'Institute of Medical Sciences, BHU' },
    { code: '700387', search: 'IPGMER' },
    { code: '700482', search: 'Kakatiya Medical College' },
    { code: '700403', search: 'Kidwai Memorial' },
    { code: '700370', search: 'LLRM Medical College' },
    { code: '902829', search: 'Mahrishi Balark' },
    { code: '700417', search: 'MGM Medical College, Jamshedpur' },
    { code: '700119', search: 'Maulana Azad Medical College' },
    { code: '700392', search: 'Medical College, Kolkata' },
    { code: '700537', search: 'Murshidabad Medical College' },
    { code: '700400', search: 'Nilratan Sircar' },
    { code: '700483', search: 'Osmania Medical College' },
    { code: '700368', search: 'Pandit Deendayal Upadhyay' },
    { code: '700357', search: 'PGIMER Dr. RML' },
    { code: '700501', search: 'Bhabha Atomic Research Centre' },
    { code: '700487', search: 'RIMS, Ongole' },
    { code: '700471', search: 'SV Medical College, Tirupati' },
    { code: '700375', search: 'SN Medical College, Agra' },
    { code: '700327', search: 'SMS Medical College' },
    { code: '902850', search: 'Shaheed Nirmal Mahto' },
    { code: '700113', search: 'Shri Krishna Medical College, Muzzafarpur' },
    { code: '700472', search: 'Siddhartha Medical College' },
    { code: '700336', search: 'SCB Medical College, Cuttack' },
    { code: '700312', search: 'Swami Ramanand Teerth' },
    { code: '700530', search: 'Government Medical College, Thiruvarur' },
    { code: '700123', search: 'University College of Medical Sciences' },
    { code: '700377', search: 'Uttar Pradesh University of Medical Sciences' },
    { code: '700541', search: 'Vardhman Institute of Medical Sciences' },
    { code: '700396', search: 'Vijaynagar Institute of Medical Sciences' },
    { code: '700338', search: 'Veer Surendra Sai' }
];

let mapStr = "const codeToInstId = new Map([\n    ['700109', 35],\n    ['700480', 36],\n";

aliasConfig.forEach(conf => {
    let match = insts.find(i => i.name.toLowerCase().includes(conf.search.toLowerCase()) || (i.short_name && i.short_name.toLowerCase().includes(conf.search.toLowerCase())));
    if (match) {
        mapStr += `    ['${conf.code}', ${match.id}], // ${conf.search}\n`;
    } else {
        console.log("NOT FOUND:", conf.search);
    }
});
mapStr += "]);";
console.log(mapStr);
