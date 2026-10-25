// Official Nifty 100 constituent snapshot; not a live price feed.
export const STOCK_SOURCE = { url: "https://www.niftyindices.com/IndexConstituent/ind_nifty100list.csv", checked: "25 October 2026" } as const;
export interface Stock { name: string; symbol: string; isin: string; industry: string }
export const STOCKS: Stock[] = [
  {
    "name": "ABB India Ltd.",
    "symbol": "ABB",
    "isin": "INE117A01022",
    "industry": "Capital Goods"
  },
  {
    "name": "Adani Energy Solutions Ltd.",
    "symbol": "ADANIENSOL",
    "isin": "INE931S01010",
    "industry": "Power"
  },
  {
    "name": "Adani Enterprises Ltd.",
    "symbol": "ADANIENT",
    "isin": "INE423A01024",
    "industry": "Metals & Mining"
  },
  {
    "name": "Adani Green Energy Ltd.",
    "symbol": "ADANIGREEN",
    "isin": "INE364U01010",
    "industry": "Power"
  },
  {
    "name": "Adani Ports and Special Economic Zone Ltd.",
    "symbol": "ADANIPORTS",
    "isin": "INE742F01042",
    "industry": "Services"
  },
  {
    "name": "Adani Power Ltd.",
    "symbol": "ADANIPOWER",
    "isin": "INE814H01029",
    "industry": "Power"
  },
  {
    "name": "Ambuja Cements Ltd.",
    "symbol": "AMBUJACEM",
    "isin": "INE079A01024",
    "industry": "Construction Materials"
  },
  {
    "name": "Apollo Hospitals Enterprise Ltd.",
    "symbol": "APOLLOHOSP",
    "isin": "INE437A01024",
    "industry": "Healthcare"
  },
  {
    "name": "Asian Paints Ltd.",
    "symbol": "ASIANPAINT",
    "isin": "INE021A01026",
    "industry": "Consumer Durables"
  },
  {
    "name": "Avenue Supermarts Ltd.",
    "symbol": "DMART",
    "isin": "INE192R01011",
    "industry": "Consumer Services"
  },
  {
    "name": "Axis Bank Ltd.",
    "symbol": "AXISBANK",
    "isin": "INE238A01034",
    "industry": "Financial Services"
  },
  {
    "name": "BSE Ltd.",
    "symbol": "BSE",
    "isin": "INE118H01025",
    "industry": "Financial Services"
  },
  {
    "name": "Bajaj Auto Ltd.",
    "symbol": "BAJAJ-AUTO",
    "isin": "INE917I01010",
    "industry": "Automobile and Auto Components"
  },
  {
    "name": "Bajaj Finance Ltd.",
    "symbol": "BAJFINANCE",
    "isin": "INE296A01032",
    "industry": "Financial Services"
  },
  {
    "name": "Bajaj Finserv Ltd.",
    "symbol": "BAJAJFINSV",
    "isin": "INE918I01026",
    "industry": "Financial Services"
  },
  {
    "name": "Bajaj Holdings & Investment Ltd.",
    "symbol": "BAJAJHLDNG",
    "isin": "INE118A01012",
    "industry": "Financial Services"
  },
  {
    "name": "Bank of Baroda",
    "symbol": "BANKBARODA",
    "isin": "INE028A01039",
    "industry": "Financial Services"
  },
  {
    "name": "Bharat Electronics Ltd.",
    "symbol": "BEL",
    "isin": "INE263A01024",
    "industry": "Capital Goods"
  },
  {
    "name": "Bharat Petroleum Corporation Ltd.",
    "symbol": "BPCL",
    "isin": "INE029A01011",
    "industry": "Oil Gas & Consumable Fuels"
  },
  {
    "name": "Bharti Airtel Ltd.",
    "symbol": "BHARTIARTL",
    "isin": "INE397D01024",
    "industry": "Telecommunication"
  },
  {
    "name": "Bosch Ltd.",
    "symbol": "BOSCHLTD",
    "isin": "INE323A01026",
    "industry": "Automobile and Auto Components"
  },
  {
    "name": "Britannia Industries Ltd.",
    "symbol": "BRITANNIA",
    "isin": "INE216A01030",
    "industry": "Fast Moving Consumer Goods"
  },
  {
    "name": "CG Power and Industrial Solutions Ltd.",
    "symbol": "CGPOWER",
    "isin": "INE067A01029",
    "industry": "Capital Goods"
  },
  {
    "name": "Canara Bank",
    "symbol": "CANBK",
    "isin": "INE476A01022",
    "industry": "Financial Services"
  },
  {
    "name": "Cholamandalam Investment and Finance Company Ltd.",
    "symbol": "CHOLAFIN",
    "isin": "INE121A01024",
    "industry": "Financial Services"
  },
  {
    "name": "Cipla Ltd.",
    "symbol": "CIPLA",
    "isin": "INE059A01026",
    "industry": "Healthcare"
  },
  {
    "name": "Coal India Ltd.",
    "symbol": "COALINDIA",
    "isin": "INE522F01014",
    "industry": "Oil Gas & Consumable Fuels"
  },
  {
    "name": "Cummins India Ltd.",
    "symbol": "CUMMINSIND",
    "isin": "INE298A01020",
    "industry": "Capital Goods"
  },
  {
    "name": "DLF Ltd.",
    "symbol": "DLF",
    "isin": "INE271C01023",
    "industry": "Realty"
  },
  {
    "name": "Divi's Laboratories Ltd.",
    "symbol": "DIVISLAB",
    "isin": "INE361B01024",
    "industry": "Healthcare"
  },
  {
    "name": "Dr. Reddy's Laboratories Ltd.",
    "symbol": "DRREDDY",
    "isin": "INE089A01031",
    "industry": "Healthcare"
  },
  {
    "name": "Eicher Motors Ltd.",
    "symbol": "EICHERMOT",
    "isin": "INE066A01021",
    "industry": "Automobile and Auto Components"
  },
  {
    "name": "Eternal Ltd.",
    "symbol": "ETERNAL",
    "isin": "INE758T01015",
    "industry": "Consumer Services"
  },
  {
    "name": "GAIL (India) Ltd.",
    "symbol": "GAIL",
    "isin": "INE129A01019",
    "industry": "Oil Gas & Consumable Fuels"
  },
  {
    "name": "Godrej Consumer Products Ltd.",
    "symbol": "GODREJCP",
    "isin": "INE102D01028",
    "industry": "Fast Moving Consumer Goods"
  },
  {
    "name": "Grasim Industries Ltd.",
    "symbol": "GRASIM",
    "isin": "INE047A01021",
    "industry": "Construction Materials"
  },
  {
    "name": "HCL Technologies Ltd.",
    "symbol": "HCLTECH",
    "isin": "INE860A01027",
    "industry": "Information Technology"
  },
  {
    "name": "HDFC Asset Management Company Ltd.",
    "symbol": "HDFCAMC",
    "isin": "INE127D01025",
    "industry": "Financial Services"
  },
  {
    "name": "HDFC Bank Ltd.",
    "symbol": "HDFCBANK",
    "isin": "INE040A01034",
    "industry": "Financial Services"
  },
  {
    "name": "HDFC Life Insurance Company Ltd.",
    "symbol": "HDFCLIFE",
    "isin": "INE795G01014",
    "industry": "Financial Services"
  },
  {
    "name": "Hindalco Industries Ltd.",
    "symbol": "HINDALCO",
    "isin": "INE038A01020",
    "industry": "Metals & Mining"
  },
  {
    "name": "Hindustan Aeronautics Ltd.",
    "symbol": "HAL",
    "isin": "INE066F01020",
    "industry": "Capital Goods"
  },
  {
    "name": "Hindustan Unilever Ltd.",
    "symbol": "HINDUNILVR",
    "isin": "INE030A01027",
    "industry": "Fast Moving Consumer Goods"
  },
  {
    "name": "Hindustan Zinc Ltd.",
    "symbol": "HINDZINC",
    "isin": "INE267A01025",
    "industry": "Metals & Mining"
  },
  {
    "name": "Hitachi Energy India Ltd.",
    "symbol": "POWERINDIA",
    "isin": "INE07Y701011",
    "industry": "Capital Goods"
  },
  {
    "name": "Hyundai Motor India Ltd.",
    "symbol": "HYUNDAI",
    "isin": "INE0V6F01027",
    "industry": "Automobile and Auto Components"
  },
  {
    "name": "ICICI Bank Ltd.",
    "symbol": "ICICIBANK",
    "isin": "INE090A01021",
    "industry": "Financial Services"
  },
  {
    "name": "ITC Ltd.",
    "symbol": "ITC",
    "isin": "INE154A01025",
    "industry": "Fast Moving Consumer Goods"
  },
  {
    "name": "Indian Oil Corporation Ltd.",
    "symbol": "IOC",
    "isin": "INE242A01010",
    "industry": "Oil Gas & Consumable Fuels"
  },
  {
    "name": "Indian Railway Finance Corporation Ltd.",
    "symbol": "IRFC",
    "isin": "INE053F01010",
    "industry": "Financial Services"
  },
  {
    "name": "Infosys Ltd.",
    "symbol": "INFY",
    "isin": "INE009A01021",
    "industry": "Information Technology"
  },
  {
    "name": "InterGlobe Aviation Ltd.",
    "symbol": "INDIGO",
    "isin": "INE646L01027",
    "industry": "Services"
  },
  {
    "name": "JSW Steel Ltd.",
    "symbol": "JSWSTEEL",
    "isin": "INE019A01038",
    "industry": "Metals & Mining"
  },
  {
    "name": "Jindal Steel Ltd.",
    "symbol": "JINDALSTEL",
    "isin": "INE749A01030",
    "industry": "Metals & Mining"
  },
  {
    "name": "Jio Financial Services Ltd.",
    "symbol": "JIOFIN",
    "isin": "INE758E01017",
    "industry": "Financial Services"
  },
  {
    "name": "Kotak Mahindra Bank Ltd.",
    "symbol": "KOTAKBANK",
    "isin": "INE237A01036",
    "industry": "Financial Services"
  },
  {
    "name": "LTM Ltd.",
    "symbol": "LTM",
    "isin": "INE214T01019",
    "industry": "Information Technology"
  },
  {
    "name": "Larsen & Toubro Ltd.",
    "symbol": "LT",
    "isin": "INE018A01030",
    "industry": "Construction"
  },
  {
    "name": "Mahindra & Mahindra Ltd.",
    "symbol": "M&M",
    "isin": "INE101A01026",
    "industry": "Automobile and Auto Components"
  },
  {
    "name": "Maruti Suzuki India Ltd.",
    "symbol": "MARUTI",
    "isin": "INE585B01010",
    "industry": "Automobile and Auto Components"
  },
  {
    "name": "Max Healthcare Institute Ltd.",
    "symbol": "MAXHEALTH",
    "isin": "INE027H01010",
    "industry": "Healthcare"
  },
  {
    "name": "Mazagoan Dock Shipbuilders Ltd.",
    "symbol": "MAZDOCK",
    "isin": "INE249Z01020",
    "industry": "Capital Goods"
  },
  {
    "name": "Muthoot Finance Ltd.",
    "symbol": "MUTHOOTFIN",
    "isin": "INE414G01012",
    "industry": "Financial Services"
  },
  {
    "name": "NTPC Ltd.",
    "symbol": "NTPC",
    "isin": "INE733E01010",
    "industry": "Power"
  },
  {
    "name": "Nestle India Ltd.",
    "symbol": "NESTLEIND",
    "isin": "INE239A01024",
    "industry": "Fast Moving Consumer Goods"
  },
  {
    "name": "Oil & Natural Gas Corporation Ltd.",
    "symbol": "ONGC",
    "isin": "INE213A01029",
    "industry": "Oil Gas & Consumable Fuels"
  },
  {
    "name": "Pidilite Industries Ltd.",
    "symbol": "PIDILITIND",
    "isin": "INE318A01026",
    "industry": "Chemicals"
  },
  {
    "name": "Polycab India Ltd.",
    "symbol": "POLYCAB",
    "isin": "INE455K01017",
    "industry": "Capital Goods"
  },
  {
    "name": "Power Finance Corporation Ltd.",
    "symbol": "PFC",
    "isin": "INE134E01011",
    "industry": "Financial Services"
  },
  {
    "name": "Power Grid Corporation of India Ltd.",
    "symbol": "POWERGRID",
    "isin": "INE752E01010",
    "industry": "Power"
  },
  {
    "name": "Punjab National Bank",
    "symbol": "PNB",
    "isin": "INE160A01022",
    "industry": "Financial Services"
  },
  {
    "name": "Reliance Industries Ltd.",
    "symbol": "RELIANCE",
    "isin": "INE002A01018",
    "industry": "Oil Gas & Consumable Fuels"
  },
  {
    "name": "SBI Life Insurance Company Ltd.",
    "symbol": "SBILIFE",
    "isin": "INE123W01016",
    "industry": "Financial Services"
  },
  {
    "name": "Samvardhana Motherson International Ltd.",
    "symbol": "MOTHERSON",
    "isin": "INE775A01035",
    "industry": "Automobile and Auto Components"
  },
  {
    "name": "Shriram Finance Ltd.",
    "symbol": "SHRIRAMFIN",
    "isin": "INE721A01047",
    "industry": "Financial Services"
  },
  {
    "name": "Siemens Energy India Ltd.",
    "symbol": "ENRIN",
    "isin": "INE1NPP01017",
    "industry": "Capital Goods"
  },
  {
    "name": "Siemens Ltd.",
    "symbol": "SIEMENS",
    "isin": "INE003A01024",
    "industry": "Capital Goods"
  },
  {
    "name": "Solar Industries India Ltd.",
    "symbol": "SOLARINDS",
    "isin": "INE343H01029",
    "industry": "Chemicals"
  },
  {
    "name": "State Bank of India",
    "symbol": "SBIN",
    "isin": "INE062A01020",
    "industry": "Financial Services"
  },
  {
    "name": "Sun Pharmaceutical Industries Ltd.",
    "symbol": "SUNPHARMA",
    "isin": "INE044A01036",
    "industry": "Healthcare"
  },
  {
    "name": "TVS Motor Company Ltd.",
    "symbol": "TVSMOTOR",
    "isin": "INE494B01023",
    "industry": "Automobile and Auto Components"
  },
  {
    "name": "Tata Capital Ltd.",
    "symbol": "TATACAP",
    "isin": "INE976I01016",
    "industry": "Financial Services"
  },
  {
    "name": "Tata Consultancy Services Ltd.",
    "symbol": "TCS",
    "isin": "INE467B01029",
    "industry": "Information Technology"
  },
  {
    "name": "Tata Consumer Products Ltd.",
    "symbol": "TATACONSUM",
    "isin": "INE192A01025",
    "industry": "Fast Moving Consumer Goods"
  },
  {
    "name": "Tata Motors Ltd.",
    "symbol": "TMCV",
    "isin": "INE1TAE01010",
    "industry": "Capital Goods"
  },
  {
    "name": "Tata Motors Passenger Vehicles Ltd.",
    "symbol": "TMPV",
    "isin": "INE155A01022",
    "industry": "Automobile and Auto Components"
  },
  {
    "name": "Tata Power Co. Ltd.",
    "symbol": "TATAPOWER",
    "isin": "INE245A01021",
    "industry": "Power"
  },
  {
    "name": "Tata Steel Ltd.",
    "symbol": "TATASTEEL",
    "isin": "INE081A01020",
    "industry": "Metals & Mining"
  },
  {
    "name": "Tech Mahindra Ltd.",
    "symbol": "TECHM",
    "isin": "INE669C01036",
    "industry": "Information Technology"
  },
  {
    "name": "Titan Company Ltd.",
    "symbol": "TITAN",
    "isin": "INE280A01028",
    "industry": "Consumer Durables"
  },
  {
    "name": "Torrent Pharmaceuticals Ltd.",
    "symbol": "TORNTPHARM",
    "isin": "INE685A01028",
    "industry": "Healthcare"
  },
  {
    "name": "Trent Ltd.",
    "symbol": "TRENT",
    "isin": "INE849A01020",
    "industry": "Consumer Services"
  },
  {
    "name": "UltraTech Cement Ltd.",
    "symbol": "ULTRACEMCO",
    "isin": "INE481G01011",
    "industry": "Construction Materials"
  },
  {
    "name": "Union Bank of India",
    "symbol": "UNIONBANK",
    "isin": "INE692A01016",
    "industry": "Financial Services"
  },
  {
    "name": "Varun Beverages Ltd.",
    "symbol": "VBL",
    "isin": "INE200M01039",
    "industry": "Fast Moving Consumer Goods"
  },
  {
    "name": "Vedanta Aluminium Metal Ltd.",
    "symbol": "VAML",
    "isin": "INE1CDF01017",
    "industry": "Metals & Mining"
  },
  {
    "name": "Vedanta Ltd.",
    "symbol": "VEDL",
    "isin": "INE205A01025",
    "industry": "Metals & Mining"
  },
  {
    "name": "Vodafone Idea Ltd.",
    "symbol": "IDEA",
    "isin": "INE669E01016",
    "industry": "Telecommunication"
  },
  {
    "name": "Wipro Ltd.",
    "symbol": "WIPRO",
    "isin": "INE075A01022",
    "industry": "Information Technology"
  },
  {
    "name": "Zydus Lifesciences Ltd.",
    "symbol": "ZYDUSLIFE",
    "isin": "INE010B01027",
    "industry": "Healthcare"
  }
];
