sap.ui.define([
	"com/erpx/site/prulia/PRULIA/utils/Config",
	"com/erpx/site/prulia/PRULIA/utils/ErrorHandler",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"sap/m/Dialog",
	"sap/m/Title",
	"sap/m/VBox",
	'sap/ui/layout/form/SimpleForm',
	"sap/m/Label",
	"sap/m/Input",
	"sap/m/Button",
	"sap/m/MessageBox",
	"com/erpx/site/prulia/PRULIA/utils/Event",
	"sap/m/MessageStrip",
	"sap/m/Text"
], function (Config, ErrorHandler, JSONModel, MessageToast, Dialog, Title, VBox, SimpleForm, Label, Input, Button, MessageBox, Event, MessageStrip, Text) {
	"use strict";

	return {
		_loginModel : undefined,
		_memberModel: undefined,
		getLoginModel : function(){
			if (this._loginModel === undefined){
				this._loginModel = new JSONModel({
					memberLogon: false
				});
			}
			return this._loginModel;
		},
		getMemberModel : function(){
			if (this._memberModel === undefined){
				this._memberModel = new JSONModel();
			}
			return this._memberModel;
		},
		login: function(username, password, fnSuccess, fnError){
			/*Setup Frappe Cookie*/
			
			$.post(Config.serverURL+'/api/method/login',{ usr: username, pwd: password, device: "desktop" }, function(data, status, xhr){
				var cookie_source = xhr.getResponseHeader('Set-Cookie');
				this.readMemberDetails(function(){
					fnSuccess();
				}, fnError);
			}.bind(this)).fail(function(error) {
				ErrorHandler.handleAjaxError(error);
				fnError();
			}.bind(this));
		},
		logout: function(fnSuccess, fnError){
			$.get(Config.serverURL + '/api/method/logout', function(data, status, xhr){
				this._loginModel.setProperty("/memberLogon", false);
				this._memberModel.setData({});
				if(fnSuccess){
					fnSuccess();
				}
				// 
			}.bind(this)).fail(function(error){
				if(fnError){
					fnError();
				}
				ErrorHandler.handleAjaxError(error)
			}.bind(this))
		},
		check_if_cookie_valid: function(fnSuccess, fnError){
			var that = this;
			$.ajax(Config.serverURL+'/api/method/frappe.auth.get_logged_user', {
			     method: 'GET',
			     xhrFields: { withCredentials: true },
			     crossDomain: true
			})
			.done(function(data, status, xhr){
				this._loginModel.setProperty("/memberLogon", true);
				if(fnSuccess){
					fnSuccess();
				}
			}.bind(this)).fail(function() {
			    console.log('No valid user session found');
			    this._loginModel.setProperty("/memberLogon", false);
			    if(fnError){
					fnError();
				}
			}.bind(this));
		},
		open_forget_password_dialog: function(oController){
			if (!this.passwordDialog) {
				this.passwordDialog = new Dialog({
					title: 'Forgot Password?',
					stretch: oController.getOwnerComponent().getModel("device").getProperty("/system/phone"),
					content: new VBox({
						items:[
							new sap.m.Text({
								text:"Enter your Agent ID and NRIC Number so we can send you temporary password"
							}),
							new SimpleForm({
								editable:true,
								layout:"ResponsiveGridLayout",
								content: [
									new Label({
										text: "Agent ID"
									}),
									new Input("forgotpassword-AgentID"),
									new Label({
										text: "NRIC Number"
									}),
									new Input("forgotpassword-NricNo")
								]
							})
						]
					}),
					beginButton: new Button({
						text: 'Send',
						press: function (oEvent) {
							oController.getOwnerComponent().getModel("appParam").setProperty("/busy", true);
							this.forget_password(
								sap.ui.getCore().byId("forgotpassword-AgentID").getValue(), 
								sap.ui.getCore().byId("forgotpassword-NricNo").getValue(), 
								function(){
									oController.getOwnerComponent().getModel("appParam").setProperty("/busy", false);
								}.bind(this), function(){
									oController.getOwnerComponent().getModel("appParam").setProperty("/busy", false);
								}.bind(this));
							this.passwordDialog.close();
							// MessageToast.show("User successful login");
						}.bind(this)
					}),
					endButton: new Button({
						text: 'Cancel',
						press: function () {
							this.passwordDialog.close();
						}.bind(this)
					}),
					afterClose: function(){
						oController.getView().removeDependent(this.passwordDialog);
						this.passwordDialog.destroy();
						this.passwordDialog = undefined;

					}.bind(this)
				}).addStyleClass("sapUiContentPadding");

				//to get access to the global model
				oController.getView().addDependent(this.passwordDialog);
			}

			this.passwordDialog.open();
		},
		forget_password: function(prulia_id, nric_number, fnSuccess, fnError){
			console.log(prulia_id + " " + nric_number);
			$.ajax({
			 	type: "POST",
			  	url: Config.serverURL+'/api/method/erpx_prulia.prulia_members.doctype.prulia_member.prulia_member.forget_password',
			  	data: JSON.stringify({prulia_id: prulia_id, nric_number: nric_number}),
			  	xhrFields: { withCredentials: true },
			  	success: function(data, status, xhr){
			  		if(fnSuccess){ fnSuccess(); }
			  		if(data.message.indexOf('not found')> -1){
			  			MessageBox.show("Noticed that you are new in PRULIA, please click OK to proceed with membership registration",
							{
								icon: sap.m.MessageBox.Icon.WARNING,
          						title: "Info",
          						actions: [sap.m.MessageBox.Action.CANCEL, sap.m.MessageBox.Action.OK],
          						onClose: function(oAction){
									window.open(Config.serverURL+"/member-registration/")
								}
							}
						);
			  		} else if (data.message.indexOf('temporary login credential')> 1){
			  			MessageBox.information(data.message);
			  		} else {
			  			MessageToast.show(data.message);
			  		}
					// var cookie_source = xhr.getResponseHeader('Set-Cookie');
					// this.readMemberDetails(function(){
					// 	MessageToast.show("Member successfully login");
					// });
				}.bind(this),
			  	dataType: 'json',
			  	contentType: 'application/json',
			  	error: function(error) {
					// debugger;
					if(fnError){ fnError(); }
					if(error.responseJSON && error.responseJSON._server_messages && JSON.parse(error.responseJSON._server_messages)[0] && JSON.parse(JSON.parse(error.responseJSON._server_messages)[0]).message.indexOf('not found')> -1){
						MessageBox.show("Noticed that you are new in PRULIA, please click OK to proceed with membership registration",
							{
								icon: sap.m.MessageBox.Icon.WARNING,
          						title: "Info",
          						actions: [sap.m.MessageBox.Action.CANCEL, sap.m.MessageBox.Action.OK],
          						onClose: function(oAction){
          							if(oAction === "OK"){
          								window.open("https://admin.prulia.org.my/member-registration/");
          								// window.open("http://127.0.0.1:8000/member-registration/")
          							}
          							
									
								}
							}
						);
					} else {
						ErrorHandler.showErrorMessage(null,error);
						console.log(error); // or whatever
					}
				}.bind(this)
			})
		},
		readMemberDetails: function(fnSuccess, fnError){
			$.ajax(Config.serverURL+'/api/method/erpx_prulia.prulia_members.doctype.prulia_member.prulia_member.mobile_member_login', {
			     method: 'GET',
			     xhrFields: { withCredentials: true },
			     crossDomain: true
			})
			.done(function(data, status, xhr){
				this.setMemberModel(data.message);
				if(fnSuccess){
					fnSuccess();
				}
			}.bind(this)).fail(function(error) {
				this.logout();
				if(fnError){
					fnError();
				}
				ErrorHandler.showErrorMessage('Please login your member account to continue', undefined, true);
				// ErrorHandler.handleAjaxError();
			}.bind(this));
		},
		setMemberModel: function(memberData){
			var dialog;

			//set a yearly reminder for updating profile
			if (memberData && ((new Date() - new Date(memberData.modified)) / (1000*60*60*24)) > 365) {
				dialog = new Dialog({
					title: 'Yearly reminder',
					type: 'Message',
					state: 'Warning',
					content: new Text({
						text: 'Reminder : Kindly update your personal profile if you have not done so'
					}),
					beginButton: new Button({
						text: 'OK',
						press: function () {
							dialog.close();
						}
					}),
					afterClose: function() {
						dialog.destroy();
					}
				});
				dialog.open();
			}

			this._loginModel.setProperty("/memberLogon", true);
			if(memberData.profile_photo !== undefined && memberData.profile_photo.indexOf("/files/") === 0){
				if(Config.serverURL === "http://127.0.0.1:8080"){
	              memberData.profile_photo = "http://127.0.0.1:8000" + memberData.profile_photo;
	            } else {
	              memberData.profile_photo = Config.serverURL + memberData.profile_photo;
	            }
			}
			this._memberModel.setData(memberData);
		},
		updateMemberDetails: function(fnSuccess, fnError){
			$.ajax({
			 	type: "POST",
			  	url: Config.serverURL+'/api/method/erpx_prulia.prulia_members.doctype.prulia_member.prulia_member.update_member_pref',
			  	data: this._memberModel.getJSON(),
			  	success: function(data, status, xhr){
			 		this.setMemberModel(data.message);
			  		if(fnSuccess){ fnSuccess(); }
			  		// this.readMemberDetails(fnSuccess, fnError);
					// var cookie_source = xhr.getResponseHeader('Set-Cookie');
					// this.readMemberDetails(function(){
					// 	MessageToast.show("Member successfully login");
					// });
					}.bind(this),
			  	dataType: 'json',
			  	contentType: 'application/json',
			  	error: function(error) {
					// debugger;
					this.readMemberDetails();
					if(fnError){
						fnError();
					}
					ErrorHandler.handleAjaxError(error);
				}.bind(this)
			})
		},
		updateMemberPic: function (data, fnSuccess, fnError) {
			var memberData = JSON.parse(this._memberModel.getJSON());

			$.ajax({
				type: "POST",
				url: Config.serverURL,
				data: {
					'from_form': 1,
					'is_private': 0,
					'cmd': 'uploadfile',
					'doctype': 'PRULIA Member',
					'docname': memberData.name,
					'filename': memberData.name + '_' + data.filename,
					'file_url': '',
					'filedata': data.filedata,
					'file_size': data.size
				},
				success: function (data, status, xhr) {
					var msg = data.message;

					memberData.profile_photo = msg.file_url;
					this._memberModel.setData(memberData);
					this.updateMemberDetails(fnSuccess, fnError);
                }.bind(this),
				error: function(error) {
					// debugger;
					this.readMemberDetails();
					if(fnError){
						fnError();
					}
					ErrorHandler.handleAjaxError(error);
				}.bind(this)
			});
        },
		changePassword: function(currentPassword, newPassword, fnSuccess, fnError){
			/*Setup Frappe Cookie*/
			
			$.post(Config.serverURL+'/api/method/frappe.core.doctype.user.user.update_password',
				{ old_password: currentPassword, new_password: newPassword, logout_all_sessions: false }, function(data, status, xhr){
					if(fnSuccess){
						fnSuccess();
					}
					
			}.bind(this)).fail(function(error) {
				if(fnError){
					fnError();
				}
				ErrorHandler.handleAjaxError(error);
			}.bind(this));
		},
		open_login_dialog: function(oController, additionalMsg){
			if (!this.loginDialog) {
				this.loginDialog = new Dialog({
					title: 'Member Login',
					stretch: oController.getOwnerComponent().getModel("device").getProperty("/system/phone"),      
					content: new VBox({
						items: [ 
							new MessageStrip({
								text:additionalMsg,
								type: "Warning",
								showIcon: true,
								visible: additionalMsg ? true : false 
							}).addStyleClass("sapUiResponsiveMargin"),
							new SimpleForm({
								editable:true,
								layout:"ResponsiveGridLayout",
								content: [
									new Label({
										text: "Prudential ID"
									}),
									new Input("memberLogin-Username"),
									new Label({
										text: "Password"
									}),
									new Input("memberLogin-Password", {
										type:"Password"
									}),
									new sap.m.Link({text:"Forgot Password / First time", press: function(){
											this.loginDialog.close();
											this.open_forget_password_dialog(oController);
										}.bind(this)
									})
								]
							})
						]
					}),
					beginButton: new Button({
						text: 'Login',
						press: function (oEvent) {
							oController.getOwnerComponent().getModel("appParam").setProperty("/busy", true);
							this.login(
								sap.ui.getCore().byId("memberLogin-Username").getValue(), 
								sap.ui.getCore().byId("memberLogin-Password").getValue(), 
								function(){
									Event.getInstance().updateEventModel(function(){
										MessageToast.show("Member successfully login");
										oController.getOwnerComponent().getModel("appParam").setProperty("/busy", false);
									}.bind(this),
									function(){
										oController.getOwnerComponent().getModel("appParam").setProperty("/busy", false);
									}.bind(this))
									
								}.bind(this), function(){
									oController.getOwnerComponent().getModel("appParam").setProperty("/busy", false);
								}.bind(this));
							this.loginDialog.close();
							// MessageToast.show("User successful login");
						}.bind(this)
					}),
					endButton: new Button({
						text: 'Cancel',
						press: function () {
							this.loginDialog.close();
						}.bind(this)
					}),
					afterClose: function(){
						this.loginDialog.destroy();
						this.loginDialog = undefined;
					}.bind(this)
				});

				//to get access to the global model
				oController.getView().addDependent(this.loginDialog);
			}
			this.loginDialog.open();
		},
	};
});