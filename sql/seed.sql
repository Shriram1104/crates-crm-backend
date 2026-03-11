USE crates_crm;

INSERT INTO users (full_name, email, password_hash, mobile_number, role, is_active)
VALUES
('System Admin', 'admin@tripak.local', '3eec6906f6067ce92b31f437c1bdf3caa9bc7292ea0cf8ce7a745e821ae997f963a39f7599c81358236df9a80fc04267fdf8951a0fa046e6387f35714dcb5b52', '9999999999', 'admin', 1)
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);

INSERT INTO config_values (config_key, config_label, config_value, value_type, category_name)
VALUES
('profit_overhead_percent', 'Profit & Factory Overhead %', '15', 'number', 'summary'),
('default_freight_rate', 'Default Freight Rate', '0', 'number', 'summary'),
('default_label_holder_rate', 'Default Label Holder Rate', '0', 'number', 'summary'),
('default_foam_rate', 'Default Foam Rate', '0', 'number', 'materials')
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);


INSERT INTO plastic_crate_master (series_name, size_mm, cost_per_unit, discount_percent, is_active)
VALUES
('300 x 200 SERIES', '300 X 200 X 100', 150.00, 0.1000, 1),
('300 x 200 SERIES', '300 X 200 X 150', 200.00, 0.1000, 1),
('300 x 200 SERIES', '300 X 200 X 175', 200.00, 0.1000, 1),
('300 x 200 SERIES', '300 X 200 X 200', 275.00, 0.1000, 1),
('300 x 200 SERIES', 'LID 300 x 200', 100.00, 0.1000, 1),
('400 x 300 SERIES', '400 X 300 X 065', 250.00, 0.1000, 1),
('400 x 300 SERIES', '400 X 300 X 090', 275.00, 0.1000, 1),
('400 x 300 SERIES', '400 X 300 X 100', 275.00, 0.1000, 1),
('400 x 300 SERIES', '400 X 300 X 120', 300.00, 0.1000, 1),
('400 x 300 SERIES', '400 X 400 X 120', 450.00, 0.1000, 1),
('400 x 300 SERIES', '400 X 300 X 150', 350.00, 0.1000, 1),
('400 x 300 SERIES', '400 X 300 X 175', 350.00, 0.1000, 1),
('400 x 300 SERIES', '400.X 300 X 200', 400.00, 0.1000, 1),
('400 x 300 SERIES', '400 X 300 X 220', 425.00, 0.1000, 1),
('400 x 300 SERIES', '400 X 300 X 240', 550.00, 0.1000, 1),
('400 x 300 SERIES', '400 X 300 X 275', 500.00, 0.1000, 1),
('400 x 300 SERIES', '400 X 300 X 320', 650.00, 0.1000, 1),
('400 x 300 SERIES', 'LID 400 x 300', 150.00, 0.1000, 1),
('500 x 325 SERIES', '500 X 325 X 100', 350.00, 0.1000, 1),
('500 x 325 SERIES', '500 X 325 X 150', 400.00, 0.1000, 1),
('500 x 325 SERIES', '500 X 325 X 200', 500.00, 0.1000, 1),
('500 x 325 SERIES', '500 X 325 X 250', 600.00, 0.1000, 1),
('500 x 325 SERIES', 'LID 500 x 325', 200.00, 0.1000, 1),
('540 x 360 SERIES', '540 X 360 X 205', 600.00, 0.1000, 1),
('540 x 360 SERIES', '540 X 360 X 300', 750.00, 0.1000, 1),
('540 x 360 SERIES', '540 X 360 X 340', 850.00, 0.1000, 1),
('600X400 SERIES', '600 X 400 X 080', 400.00, 0.1000, 1),
('600X400 SERIES', '600 X 400 X 100', 500.00, 0.1000, 1),
('600X400 SERIES', '600 X 400 X 125', 500.00, 0.1000, 1),
('600X400 SERIES', '600 X 400 X 160', 550.00, 0.1000, 1),
('600X400 SERIES', '600 X 400 X 175', 625.00, 0.1000, 1),
('600X400 SERIES', '600 X 400 X 200', 675.00, 0.1000, 1),
('600X400 SERIES', '600 X 400 X 220', 725.00, 0.1000, 1),
('600X400 SERIES', '600 X 400 X 240', 750.00, 0.1000, 1),
('600X400 SERIES', '600 X 400 X 275', 900.00, 0.1000, 1),
('600X400 SERIES', '600 X 400 X 300', 1050.00, 0.1000, 1),
('600X400 SERIES', '600 X 400 X 325', 950.00, 0.1000, 1),
('600X400 SERIES', '600 X 400 X 380', 1100.00, 0.1000, 1),
('600X400 SERIES', '600 X 400 X 425', 1250.00, 0.1000, 1),
('600X400 SERIES', '600 X 400 X 485', 1500.00, 0.1000, 1),
('600X400 SERIES', 'LID600x400', 300.00, 0.1000, 1),
('MINI JUMBO SERIES', '650 X 450 X 210', 1000.00, 0.1000, 1),
('MINI JUMBO SERIES', '650 X 450 X 260', 1100.00, 0.1000, 1),
('JUMBO SERIES', '650 X 450 X 315', 1300.00, 0.1000, 1),
('JUMBO SERIES', '650 X 450 X 355', 1400.00, 0.1000, 1),
('JUMBO SERIES', '650 X 450 X 485', 2000.00, 0.1000, 1),
('JUMBO SERIES', 'LID 650 x 450', 450.00, 0.1000, 1),
('SUPER JUMBO SERIES', '809 X 565 X 431', 2000.00, 0.1000, 1),
('SUPER JUMBO SERIES', '809 X 565 X 431 (LW)', 1850.00, 0.1000, 1),
('SUPER JUMBO SERIES', 'SUPER JUMBO LID', 750.00, 0.1000, 1)
ON DUPLICATE KEY UPDATE series_name = VALUES(series_name), cost_per_unit = VALUES(cost_per_unit), discount_percent = VALUES(discount_percent), is_active = VALUES(is_active);

INSERT INTO config_values (config_key, config_label, config_value, value_type, category_name)
VALUES
('cnc_partition_cost_default', 'CNC Partition cost-', '{"sheetSizeLengthInMeter":1,"sheetSizeWidthInMeter":2,"sheetThickness":8,"ratesPerMmPerSequreMeter":135,"transportCostPerKgs":12,"totalWeightPerSheetInKgs":16,"desingCostPerSheetCostPerHours":200,"desingCostPerSheetRequiredHours":2,"machinPerHourCostIncudingMachinOperators":125,"machinPerHourRequiredHours":2,"handlingChargesAfterMachiningCostPerHours":400,"handlingChargesAfterMachiningRequiredHours":1,"factoryOverheadPercent":40,"profitPercent":20,"sizeOfSheetInMilimeterMmLengthSideLength":2000,"sizeOfSheetInMilimeterMmLengthSideWidth":1000,"sizeOfLengthSidePattiLength":400,"sizeOfLengthSidePattiWidth":20,"sizeOfSheetInMilimeterMmWidthSideLength":1200,"sizeOfSheetInMilimeterMmWidthSideWidth":1900,"sizeOfWidthSidePattiLength":360,"sizeOfWidthSidePattiWidth":120}', 'json', 'workbook-defaults'),
('pp_partition_insert_cost_default', 'PP Partition - Insert cost', '{"rateKg":200,"gsm":1,"ppSheetSpecification":"5mm/ 1000gsm -PP Flute board","productName":"5x3=15 Pkts , Ht- 120mm","line1BoardWidth":1200,"insertHeight":354,"line1PcInsert":11,"line1PcSheet":1,"line2BoardWidth":800,"line2PcInsert":10,"line2PcSheet":1,"line3BoardWidth":800,"line3BoardHeight":2,"line3RateKg":0,"line3Gsm":0,"line3PcInsert":11,"line3PcSheet":1,"fabricationChrgsPercent":0.14,"dieCostTotal":0,"dieCostDivisor":100,"wastagePercent":0.03,"overHeadPercent":0.07,"otherChargesPercent":0.1,"tptChrgs":5,"profitPercent":0.2}', 'json', 'workbook-defaults'),
('equal_pkts_partition_cost_hdpe_default', 'Equal Pkts Partition cost-HDPE', '{"lengthsideArea":270,"lengthsidePartHeight":150,"lengthsideStripsNos":2,"widthsideArea":170,"widthsidePartHeight":150,"widthsideStripsNos":3,"blockingAreaArea":210,"blockingAreaPartHeight":100,"blockingAreaStripsNos":0,"additionalStripsArea":460,"additionalStripsPartHeight":100,"additionalStripsNos":0,"hdpeSheetThickness":2,"ratePerMeter":500}', 'json', 'workbook-defaults'),
('equal_pkts_partition_foam_cost_default', 'Equal Pkts Partition Foam Cost', '{"lengthsideArea":565,"lengthsidePartHeight":100,"lengthsideStripsNos":2,"widthsideArea":365,"widthsidePartHeight":100,"widthsideStripsNos":3,"blockingAreaArea":210,"blockingAreaPartHeight":100,"blockingAreaStripsNos":1,"additionalStripsArea":460,"additionalStripsPartHeight":100,"additionalStripsNos":2,"foamSheetThickness":3,"ratePerMeter":300}', 'json', 'workbook-defaults'),
('pvc_flap_cover_default', 'PVC Flap Cover', '{"typesOfFlapCover":"PVC Flap Cover","cratesSize":"600 X 400","flapCoverSizes":"600 X 400 X 120","gsmOfFlapCover":180,"flapMaterialRate":250,"velcro25mmRate":12,"velcro50mmRate":18,"sizeOfFlapCoverLength":0.6,"sizeOfFlapCoverWdith":0.4,"unit":1,"sidePatti25mmRate":10,"sidePatti50mmRate":15,"foamSizeRate":20,"thredeRate":2,"labourChargesRate":6,"localFreightBase":1,"localFreightRate":25,"profitPercent":20}', 'json', 'workbook-defaults')
ON DUPLICATE KEY UPDATE config_label = VALUES(config_label), config_value = VALUES(config_value), value_type = VALUES(value_type), category_name = VALUES(category_name);
