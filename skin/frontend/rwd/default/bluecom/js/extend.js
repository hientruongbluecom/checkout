;
//DUMMY FOR EE CHECKOUT
var checkout =  {
    steps : new Array("login", "billing", "shipping", "shipping_method", "payment", "review"),

    gotoSection: function(section){
         BC.ONECHECKOUT.backToOpc();
    },
    accordion:{

    }
};


 BC.ONECHECKOUT.prepareExtendPaymentForm =  function(){
    $j_bc('.opc-col-left').hide();
    $j_bc('.opc-col-center').hide();
    $j_bc('.opc-col-right').hide();
    $j_bc('.opc-menu p.left').hide();
    $j_bc('#checkout-review-table-wrapper').hide();
    $j_bc('#checkout-review-submit').hide();

    $j_bc('.review-menu-block').addClass('payment-form-full-page');

};

 BC.ONECHECKOUT.backToOpc =  function(){
    $j_bc('.opc-col-left').show();
    $j_bc('.opc-col-center').show();
    $j_bc('.opc-col-right').show();
    $j_bc('#checkout-review-table-wrapper').show();
    $j_bc('#checkout-review-submit').show();



    //hide payments form
    $j_bc('#payflow-advanced-iframe').hide();
    $j_bc('#payflow-link-iframe').hide();
    $j_bc('#hss-iframe').hide();


    $j_bc('.review-menu-block').removeClass('payment-form-full-page');

     BC.ONECHECKOUT.saveOrderStatus = false;

};



 BC.ONECHECKOUT.Plugin = {

    observer: {},


    dispatch: function(event, data){


        if (typeof( BC.ONECHECKOUT.Plugin.observer[event]) !="undefined"){

            var callback =  BC.ONECHECKOUT.Plugin.observer[event];
            callback(data);

        }
    },

    event: function(eventName, callback){
         BC.ONECHECKOUT.Plugin.observer[eventName] = callback;
    }
};

/** 3D Secure Credit Card Validation - CENTINEL **/
 BC.ONECHECKOUT.Centinel = {
    init: function(){
         BC.ONECHECKOUT.Plugin.event('savePaymentAfter',  BC.ONECHECKOUT.Centinel.validate);
    },

    validate: function(){
        var c_el = $j_bc('#centinel_authenticate_block');
        if(typeof(c_el) != 'undefined' && c_el != undefined && c_el){
            if(c_el.attr('id') == 'centinel_authenticate_block'){
                 BC.ONECHECKOUT.prepareExtendPaymentForm();
            }
        }
    },

    success: function(){
        var exist_el = false;
        if(typeof(c_el) != 'undefined' && c_el != undefined && c_el){
            if(c_ell.attr('id') == 'centinel_authenticate_block'){
                exist_el = true;
            }
        }

        if (typeof(CentinelAuthenticateController) != "undefined" || exist_el){
             BC.ONECHECKOUT.backToOpc();
        }
    }

};


function toggleContinueButton(){}//dummy

$j_bc(document).ready(function(){
     BC.ONECHECKOUT.Centinel.init();
});
