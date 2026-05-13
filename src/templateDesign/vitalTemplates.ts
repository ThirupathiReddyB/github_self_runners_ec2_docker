export const vitalReportTemplateBloodPressure = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Vital Report</title>
  <style>
    body {
      font-family: 'Segoe UI', sans-serif;
      margin: 0;
      padding: 20px;
      background: #fff;
    }
    .container {
      border: 1px dashed #ccc;
      padding: 20px;
      max-width: 800px;
      margin: auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      
    }
    .logo {
      display: flex;
    }
    .logo img {
      height: 100px;
      margin-right: 100px;
    }
    .uid {
      color: #777;
      font-size: 14px;
      padding-top:23px
    }
     .uid-value {
  color: #000; /* Makes the UID value black */
  font-weight: 500;
}
    .section {
      margin-bottom: 10px;
    }
    .title {
      font-family: 'Mulish', sans-serif;
      font-weight: 500;
      font-size: 18px;
      line-height: 100%; /* or line-height: 16px; */
      letter-spacing: 0;
      color: #303030;
    }
    .subtitle {
      color:#747474;
      font-size: 16px;
      padding-top:8px
    }
    .info {
      display: flex;
      justify-content: space-between;
      margin-top: 35px;
    }
    .info span {
      font-size: 16px;
    }
    .info .bold {
      font-weight: bold;
      color: #333;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    table, th, td {
      border: 1px solid #aaa;
    },
   
    th, td {
      text-align: center;
      padding: 8px;
    }
    th {
      background: #f4f4f4;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <img src={{thitoLogo}} alt="Logo" />
      </div>
      <div class="uid">
       <div class="uid">
  UID : <span class="uid-value">{{userId}}</span>
</div>
      </div>
    </div>
    <hr/>

    <div class="section">
      <div class="info">
      <div class="title">{{userName}}</div>
      <span style="color:#747474">Download date :<span style="color:#303030">{{downloadDate}}</span></span>
      </div>
      </div>
      <div class="subtitle">{{userAge}} years / {{gender}} / {{bloodGroup}}</div>
    

    <div class="info" style="padding-bottom:10px">
      <span style="color:#747474">Vital : <span style="color:#303030">{{vitalName}}</span></span>
      <span style="color:#747474">Duration : <span style="color:#303030">3 Months</span></span>
    </div>

    <table  style="height: 120px;">
      <thead style="height: 30px;">
        <tr >
          <th>Sr.No.</th>
          <th>Date</th>
          <th>Time</th>
          <th>Systolic</th>
		  <th>Dystolic</th>
			<th>Unit</th>
        </tr>
      </thead>
      <tbody style="text-align: center;">
        
        {{tableRows}}
      </tbody>
    </table>
  </div>
</body>
</html>
`;

export const bloodGlucoseInsuline = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Vital Report</title>
  <style>
    body {
      font-family: 'Segoe UI', sans-serif;
      margin: 0;
      padding: 20px;
      background: #fff;
    }
    .container {
      border: 1px dashed #ccc;
      padding: 20px;
      max-width: 800px;
      margin: auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo {
      display: flex;
    }
    .logo img {
      height: 100px;
      margin-right: 100px;
    }
    .uid {
      color: #777;
      font-size: 14px;
      padding-top:23px
    }
     .uid-value {
  color: #000; /* Makes the UID value black */
  font-weight: 500;
}
    .section {
      margin-bottom: 10px;
    }
    .title {
      font-family: 'Mulish', sans-serif;
      font-weight: 500;
      font-size: 18px;
      line-height: 100%; /* or line-height: 16px; */
      letter-spacing: 0;
      color: #303030;
    }
    .subtitle {
      color:#747474;
      font-size: 16px;
      padding-top:8px
    }
    .info {
      display: flex;
      justify-content: space-between;
      margin-top: 35px;
    }
    .info span {
      font-size: 16px;
    }
    .info .bold {
      font-weight: bold;
      color: #333;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    table, th, td {
      border: 1px solid #aaa;
    },
   
    th, td {
      text-align: center;
      padding: 8px;
    }
    th {
      background: #f4f4f4;
    }
    tbody tr {
      height: 30px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <img src={{thitoLogo}} alt="Logo" />
      </div>
      <div class="uid">
       <div class="uid">
  UID : <span class="uid-value">{{userId}}</span>
</div>
      </div>
    </div>
    <hr/>

    <div class="section">
      <div class="info">
      <div class="title">{{userName}}</div>
      <span style="color:#747474">Download date :<span style="color:#303030">{{downloadDate}}</span></span>
      </div>
      </div>
      <div class="subtitle">{{userAge}} years / {{gender}} / {{bloodGroup}}</div>
    

    <div class="info" style="padding-bottom:10px">
      <span style="color:#747474">Vital : <span style="color:#303030">{{vitalName}}</span></span>
      <span style="color:#747474">Duration : <span style="color:#303030">3 Months</span></span>
    </div>
  <table >
    <tr style="height: 30px;">
      <th colspan="4" class="insulin-header">Insulin</th>
      <th colspan="3" class="blood-glucose-header">Blood Glucose</th>
    </tr>
    <tr style="height: 30px;">
      <th>Date & Time</th>
      <th>Category</th>
      <th>Unit</th>
      <th>Type</th>
      <th>Date & Time</th>
      <th>Category</th>
      <th>Unit</th>
    </tr>
    <tbody style="text-align: center;">
    {{tableRows}}
    </tbody>
  </table>

</div>
</body>
</html>
`;
