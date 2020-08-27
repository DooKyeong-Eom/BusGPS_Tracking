//index.js

//module
var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
const request = require('request-promise-native')
var app = express();


//DB setting 
mongoose.set('useNewUrlParser', true);   // mongoose의 몇몇 글로벌 설정을 해주는 부분, 수정되는 일이 없기 때문에 왠만하면 이렇게 설정 
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);
mongoose.connect(process.env.MONGO_DB); // node.js에서 기본적으로 제공되는 process.env 오브젝트는 환경변수를 가지고 있는 객체, DB connection string을 환경변수에 저장했기 때문

var db = mongoose.connection;           // mongoose의 db object를 가져와 db변수에 넣는 과정, DB와 관련된 이벤트 리스너 함수들이 있음
db.once('open', function () {              // db가 성공적으로 연결된 경우, DB 연결은 앱이 실행되면 단 한번만 일어나는 이벤트이므로 db.once('이벤트_이름',콜백_함수) 사용
    console.log('DB connected');
});
db.on('error', function (err) {            // db 연결 중 에러가 있는 경우, error는 DB접속시 뿐만 아니라, 다양한 경우에 발생할 수 있기 때문에 db.on('이벤트_이름',콜백_함수) 사용
    console.log('DB ERROR : ', err);
});

//Other settings
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


//DB schema

var citylistSchema = mongoose.Schema
    (
        {
            citycode: { type: String, require: true, unique: true },
            cityname: { type: String, require: true }
        }
    )

var CityList = mongoose.model('citylist', citylistSchema);

var busroutelistSchema = mongoose.Schema
    (
        {
            endnodenm: { type: String },
            endvehicletime: { type: String },
            routeid: { type: String, require: true, unique: true },
            routeno: { type: String },
            routetp: { type: String },
            startnodenm: { type: String },
            startvehicletime: { type: String }
        }
    )

var BusRouteList = mongoose.model('busroutelist', busroutelistSchema);


var citybusrouteSchema = mongoose.Schema
    (
        {
           
            endnodenm: { type: String },
            endvehicletime: { type: String },
            routeid: { type: String, require: true, unique: true },
            routeno: { type: String },
            routetp: { type: String },
            startnodenm: { type: String },
            startvehicletime: { type: String },
            citycode: { type: String },
            cityname: { type: String }
        }
    )

var CityBusRoute = mongoose.model('citybusroute', citybusrouteSchema);

//Routes

app.get('/', function (req, res) {
    //TODO
    // DB 콜렉션인 citylist의 정보를 공공데이터 API의 파라미터로 이용해서 전국 도시의 버스 노선 정보를 DB에 저장한다.

    //DB에서 citylist의 정보를 가져와서 citylist안의 모든 도시의 버스 노선 API를 호출하는 함수
    async function loadDBInfo() {
        try {
            var cityinfo = await CityList.find({});
            var cityinfosize = await CityList.estimatedDocumentCount({});
            var tcount =0;

            for (i = 0; i < cityinfosize; i++) {
                //도시정보를 차례대로 불러옴
                //i번째 도시코드를 이용해 request해서 버스노선을 busroute에 저장
                var url = 'http://openapi.tago.go.kr/openapi/service/BusRouteInfoInqireService/getRouteNoList';
                var queryParams = '?' + encodeURIComponent('ServiceKey') +
                    '=2HjNi8H97NzN%2BXhdCT6OsCQAoZ0lB%2BPHSmPbjRjADpeW%2BC4c88ykEkT6n1RfrKniXItcAMvpJFIgOtbY%2BpHq%2FA%3D%3D'; /* Service Key*/
                queryParams += '&_type=json';  // xml to json
                queryParams += '&' + encodeURIComponent('cityCode') + '=' + encodeURIComponent(cityinfo[i].citycode); /* 도시코드 */
                queryParams += '&' + encodeURIComponent('routeNo') + '='; /* 노선번호 */
                queryParams += '&' +  encodeURIComponent('numOfRows') + '=' + encodeURIComponent('1000'); /*한페이지에 보여줄 수 */

                await request({
                    url: url + queryParams,
                    method: 'GET'
                }, function (error, res) {

                    rtdata = JSON.parse(res.body); // push add 밀어넣어서 
                    
                    precitycode = cityinfo[i].citycode;
                    precityname = cityinfo[i].cityname;
                    
                
                    var arr = rtdata.response.body.items.item;

                    for (idx in arr) {
                        a = arr[idx];
                        a.citycode = precitycode;
                        a.cityname = precityname;
                    }

                    console.log("-------------------");
                    console.log(rtdata.response.body.items.item);
                    console.log("-------------------");                    
                    
                    tcount++; // log용 노선 뽑아낸 city카운트 변수

                    
                    CityBusRoute.create(rtdata.response.body.items.item);
                    
                    

                     
                });
            }
        }
        catch (error) {
            console.log(error);
        }
        console.log(tcount);
    }
    loadDBInfo();
    
});



//Port setting
var port = 3000;
app.listen(port, function () {
    console.log('server on! http://localhost:' + port);
});



