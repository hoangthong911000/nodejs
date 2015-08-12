var express = require('express'),
	http = require('http');
var path = require('path');
var fs  = require('fs');
var app = express();
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
var Db = require('mongodb').Db,
    MongoClient = require('mongodb').MongoClient,
    Server = require('mongodb').Server,
    ReplSetServers = require('mongodb').ReplSetServers,
    ObjectID = require('mongodb').ObjectID,
    Binary = require('mongodb').Binary,
    GridStore = require('mongodb').GridStore,
    Grid = require('mongodb').Grid,
    Code = require('mongodb').Code,
    //BSON = require('mongodb').pure().BSON,
    assert = require('assert');

 //khai bao CSDL database la qlbh  
var db = new Db('qlbh', new Server('localhost', 27017));

// khai bao Session
var session = require('client-sessions');
app.use(session({
  cookieName: 'session',
  secret: 'random_string_goes_here',
  duration: 30 * 60 * 1000,
  activeDuration: 5 * 60 * 1000,
}));

//khai bao de lay dc req.body
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
}));

//
app.use(express.static(path.join(__dirname, 'public')));
app.use('/pictures/', express.static(__dirname + '/public/upload/'));
app.set('port',process.env.PORT||3000);
app.set('view engine','jade');
app.use('views',express.static(__dirname +'/views'));

//kiem tra co phai la admin
var Admin = function(req, res, next){
    if (req.session && req.session.user && req.session.user.phanquyen == 1) {
        next();
    }
    else {
        res.redirect('/admin');
    }
}

//kiem tra dang nhap chua
var userlogin = function(req, res, next){
    if (req.session && req.session.user) {
        next();
    }
    else {
        res.redirect('/login');
    }
}

// trang index
app.get('/index',function(req,res,next){
	//hem ket noi db theo modul fibers
	var Fiber = require('fibers');
	Fiber(function(){
		var Server = require("mongo-sync").Server;
		var server = new Server('127.0.0.1');
		var result = server.db("qlbh").getCollection("sanpham").find().toArray();
		server.close();
		res.render('index',{ yt: result });
	}).run();
});


//trang login
app.get('/login',function(req,res){
	if (req.session && req.session.user) {
		res.redirect('/admin');
	}
	else{
		res.render('login');
	}	
});

//ham login
app.post('/login',function(req,res){
	var udd = req.body.UID;
	var pwd = req.body.PWD;
	var sp;
	db.open(function(err, db) {
		var collection = db.collection('user');
		collection.findOne({usename: udd , pass: pwd }, function(err, doc) {
  			//dieu kien
  			sp = doc;
			if(sp != null ){
				req.session.user = sp;
				res.redirect('/admin');
			}
			else{
				res.redirect('/login');
			}
		});
	});
});

// dang xuat
app.get('/logout', function(req, res) {
  req.session.reset();
  res.redirect('/login');
});


// trang admin
app.get('/admin',userlogin,function(req,res){
	res.render('admin');
});

//trang admin san pham 
app.get('/admin/sanpham',Admin,function(req,res){
	var Fiber = require('fibers');
	Fiber(function(){
		var Server = require("mongo-sync").Server;
		var server = new Server('127.0.0.1');
		var result = server.db("qlbh").getCollection("sanpham").find().toArray();
		server.close();
		res.render('qlsanpham',{ yt: result });
	}).run();
});

//trang add sanpham moi . chi admin moi truy cap dc
app.get('/admin/sanpham/add',Admin,function(req,res){
	res.render('addpro');
});

//ham them sp moi
app.post('/admin/sanpham/add', multipartMiddleware,function(req,res){
	var id = 11;
	var ten =req.body.tensp;
	var gia1 = req.body.gia;
	var gioithieu = req.body.FullName;
	//uphinh

	var file = req.files.picture;
	if(file){
		var originalFilename = file.name;
		var fileType         = file.type.split('/')[1];
		var fileSize         = file.size;
		var pathUpload       = __dirname + '/public/upload/' + originalFilename;
		var data = fs.readFileSync(file.path);
		fs.writeFileSync(pathUpload, data);
	}
	db.open(function(err, db) {
		var collection = db.collection('sanpham');
	// Insert a single document
		collection.insert({masp: id ,tensp: ten, mieuta: gioithieu, gia: gia1 });

	// Wait for a second before finishing up, to ensure we have written the item to disk
	});
	res.redirect('/admin/sanpham');
});

// trang edit san pham chi admin moi truy cap dc
app.get('/admin/sanpham/edit/:id',Admin,function(req,res){
	var id = req.params.id;
	db.open(function(err, db) {
		var sp;
		var collection = db.collection('sanpham');
		collection.findOne({_id: new ObjectID(id) }, function(err, doc) {
  			sp = doc;
  			res.render('editpro',{ edit: sp });
		});
	});
});

//ham edit san pham
app.post('/admin/sanpham/edit',function(req,res){
	var id = req.body.idma;
	var ten = req.body.tensp;
	var gia1 = req.body.gia;
	var gt = req.body.FullName;
	db.open(function(err, db) {
		var collection = db.collection('sanpham');
		collection.update({_id: new ObjectID(id)}, {$set:{ tensp: ten, mieuta: gt, gia: gia1 }});
	});
	res.redirect('/admin/sanpham');
});

//hamm xoa san pham
app.post('/admin/sanpham/:id',function(req,res){
	var id = req.params.id;
	db.open(function(err, db) {
		var collection = db.collection('sanpham');
      	collection.remove({_id: new ObjectID(id) });
	});
	res.redirect('/admin/sanpham');
});

//trang user
app.get('/admin/user',Admin,function(req,res){
	var Fiber = require('fibers');
	Fiber(function(){
		var Server = require("mongo-sync").Server;
		var server = new Server('127.0.0.1');
		var result = server.db("qlbh").getCollection("user").find().toArray();
		server.close();
		res.render('qluser',{ us: result });
	}).run();
});

// trang add user chi admin moi truy cap dc
app.get('/admin/user/add',Admin,function(req,res){
	res.render('adduser');
});

//ham them user
app.post('/admin/user/add',function(req,res){
	var id = 11;
	var ten =req.body.usename;
	var pass1 = req.body.pass;
	var pass2 = req.body.pass1;
	if(pass1!= pass2)
	{
		res.redirect('/admin/user/add');
	}
	else
	{
		db.open(function(err, db) {
		var collection = db.collection('user');
	// Insert a single document
		collection.insert({mauser: id ,usename: ten, pass: pass1, phanquyen: 0 });

	// Wait for a second before finishing up, to ensure we have written the item to disk
	});
	res.redirect('/admin/user');
	}
});

// trang sua user chi admin moi truy cap
app.get('/admin/user/edit/:id',Admin,function(req,res){
	var id = req.params.id;
	db.open(function(err, db) {
		var sp;
		var collection = db.collection('user');
		collection.findOne({_id: new ObjectID(id) }, function(err, doc) {
  			sp = doc;
  			res.render('edituser',{ edit: sp });
		});
	});
});

//ham edit user
app.post('/admin/user/edit',function(req,res){
	var id = req.body.idma;
	var ten = req.body.usename;
	var pass1 = req.body.pass;
	var pq = req.body.pq
	db.open(function(err, db) {
		var collection = db.collection('user');
		collection.update({_id: new ObjectID(id)}, {$set:{ usename: ten, pass: pass1, phanquyen: pq }});
	});
	res.redirect('/admin/user');	
});

//ham xoa user
app.post('/admin/user/:id',function(req,res){
	var id = req.params.id;
	db.open(function(err, db) {
		var collection = db.collection('user');
      	collection.remove({_id: new ObjectID(id) });
	});
	res.redirect('/admin/user');
});

//
http.createServer(app).listen(app.get('port'),function(){
	console.log('Start successfully');
});