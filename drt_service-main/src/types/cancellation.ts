export interface CancellationFilters {
    cancellationDate?: string;
    shipNm?: string;
    routeNm?: string;
}

export interface CancellationRow {
  cancel_dtm: string;           // 결항시각  
  plan_dtm: string;             // 운행예정시각  
  ship_nm: string;              // 선박명 
  route_nm: string;             // 원본 항로명(lcns_seawy_nm)
  start_port_nm: string;        // 출발항 
  end_port_nm: string;          // 도착항  
  cancel_reason: string;        // 결항사유  

  [key: string]: unknown;
}
