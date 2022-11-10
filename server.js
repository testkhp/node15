const express = require("express");
const MongoClient = require("mongodb").MongoClient;
const moment = require("moment");
const momentTimezone = require("moment-timezone");

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const multer  = require('multer');

const app = express();
const port = process.env.PORT || 5000;

app.set("view engine","ejs");
app.use(express.urlencoded({extended: true}));
app.use(express.static('public'));
app.use(session({secret : 'secret', resave : true, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());

MongoClient.connect("mongodb+srv://admin:qwer1234@port2.ackae9r.mongodb.net/?retryWrites=true&w=majority",function(err,result){
    //에러가 발생했을경우 메세지 출력(선택사항)
    if(err) { return console.log(err); }

    //위에서 만든 db변수에 최종연결 ()안에는 mongodb atlas 사이트에서 생성한 데이터베이스 이름
    db = result.db("port2");

    //db연결이 제대로 됬다면 서버실행
    app.listen(port,function(){
        console.log("서버연결 성공");
    });

});


//  /loginresult 경로 요청시 passport.autenticate() 함수구간이 아이디 비번 로그인 검증구간
passport.use(new LocalStrategy({
    usernameField: 'adminId',
    passwordField: 'adminPass',
    session: true,
    passReqToCallback: false,
  }, function (id, pass, done) {
    // console.log(userid, userpass);
    db.collection('user').findOne({ adminId: id }, function (err, result) {
      if (err) return done(err)
  
      if (!result) return done(null, false, { message: '존재하지않는 아이디 입니다.' })
      if (pass == result.adminPass) {
        return done(null, result)
      } else {
        return done(null, false, { message: '비번이 틀렸습니다' })
      }
    })
  }));

    //처음 로그인 했을 시 해당 사용자의 아이디를 기반으로 세션을 생성함
  //  req.user
  passport.serializeUser(function (user, done) {
    done(null, user.adminId) //서버에다가 세션만들어줘 -> 사용자 웹브라우저에서는 쿠키를 만들어줘
  });
  
  // 로그인을 한 후 다른 페이지들을 접근할 시 생성된 세션에 있는 회원정보 데이터를 보내주는 처리
  // 그전에 데이터베이스 있는 아이디와 세션에 있는 회원정보중에 아이디랑 매칭되는지 찾아주는 작업
  passport.deserializeUser(function (adminId, done) {
      db.collection('user').findOne({adminId:adminId }, function (err,result) {
        done(null, result);
      })
  }); 


//파일첨부

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/upload')
    },
    filename : function(req, file, cb){
        cb(null, file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8') )
      }
    })
const upload = multer({ storage: storage })




//커피 메뉴 페이지
app.get("/menu/coffee",(req,res)=>{
    db.collection("prdlist").find({category:"커피"}).toArray((err,result)=>{
        res.render("menu",{prdData:result});
    });
});

//쿠키 메뉴 페이지
app.get("/menu/cookie",(req,res)=>{
    db.collection("prdlist").find({category:"쿠키"}).toArray((err,result)=>{
        res.render("menu",{prdData:result});
    });
});


//관리자 화면 로그인 페이지
app.get("/admin",(req,res)=>{
    res.render("admin_login"); // admin_login.ejs 파일로 응답
});

//관리자 화면 로그인 유무 확인
app.post("/login",passport.authenticate('local', {failureRedirect : '/fail'}),(req,res)=>{
    res.redirect("/admin/prdlist");
    //로그인 성공시 관리자 상품등록 페이지로 이동
});

//로그인 실패시 fail경로
app.get("/fail",(req,res)=>{
    res.send("로그인 실패");
});

//관리자 상품등록 페이지
app.get("/admin/prdlist",(req,res)=>{
    //db에 저장되어있는 상품목록들 find 찾아와서 전달
    db.collection("prdlist").find({}).toArray((err,result)=>{
        res.render("admin_prdlist",{prdData:result,userData:req.user});
    })
    
});

//상품을 DB에 넣는 경로              //첨부한 이미지 name값
app.post("/add/prdlist",upload.single('thumbnail'),(req,res)=>{
    //파일첨부가 있을 때
    if(req.file){
        fileTest = req.file.originalname;
    }
    // 없을때
    else{
        fileTest = null;
    }
    db.collection("count").findOne({name:"상품등록"},(err,result1)=>{
        db.collection("prdlist").insertOne({
            num:result1.prdCount + 1,
            name:req.body.name,
            thumbnail:fileTest,
            category:req.body.category
        },(err,result)=>{
            db.collection("count").updateOne({name:"상품등록"},{$inc:{prdCount:1}},(err,result)=>{
                res.redirect("/admin/prdlist"); //상품등록 페이지로 이동
            });
        })
    });
});
