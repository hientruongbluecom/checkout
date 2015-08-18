;
//dummy
Billing =  Class.create();
Shipping =  Class.create();

// define jquery
if(typeof($j_bc) == 'undefined' || $j_bc == undefined || !$j_bc){
    $j_bc = false;

    if(typeof($ji) != 'undefined' && $ji != undefined && $ji)
        $j_bc = $ji; // from iwd_all 2.x
    else{
        if(typeof(jQuery) != 'undefined' && jQuery != undefined && jQuery)
            $j_bc = jQuery;
    }
}
///

var BC=BC||{};

BC.ONECHECKOUT = {

    agreements : null,
    saveOrderStatus:false,
    is_subscribe:false,

    initMessages: function(){
        $j_bc('.close-message-wrapper, .opc-messages-action .button').click(function(){
            $j_bc('.opc-message-wrapper').hide();
            $j_bc('.opc-message-container').empty();
        });
    },

    /** CREATE EVENT FOR SAVE ORDER **/
    initSaveOrder: function(){

        $j_bc(document).on('click', '.opc-btn-checkout', function(){

            if (BC.ONECHECKOUT.Checkout.disabledSave==true)
                return;

            // check agreements
            var mis_aggree = false;
            $j_bc('#checkout-agreements input[name*="agreement"]').each(function(){
                if(!$j_bc(this).is(':checked')){
                    mis_aggree = true;
                }
            });

            if(mis_aggree){
                $j_bc('.opc-message-container').html($j_bc('#agree_error').html());
                $j_bc('.opc-message-wrapper').show();
                BC.ONECHECKOUT.Checkout.hideLoader();
                BC.ONECHECKOUT.Checkout.unlockPlaceOrder();
                BC.ONECHECKOUT.saveOrderStatus = false;
                return false;
            }
            ///

            var addressForm = new VarienForm('opc-address-form-billing');
            if (!addressForm.validator.validate()){
                return;
            }

            if (!$j_bc('input[name="billing[use_for_shipping]"]').prop('checked')){
                var addressForm = new VarienForm('opc-address-form-shipping');
                if (!addressForm.validator.validate()){
                    return;
                }
            }

            // check if LIPP enabled
            if(typeof(IWD.LIPP) != 'undefined' && IWD.LIPP != undefined && IWD.LIPP != '' && IWD.LIPP)
            {
                if(IWD.LIPP.lipp_enabled){
                    var method = payment.currentMethod;
                    if(typeof(method) != 'undefined' && method != undefined && method != '' && method){
                        if (method.indexOf('paypaluk_express')!=-1 || method.indexOf('paypal_express')!=-1){
                            if (BC.ONECHECKOUT.Checkout.config.comment!=="0")
                                BC.ONECHECKOUT.saveCustomerComment();
                            IWD.LIPP.redirectPayment();
                            return;
                        }
                    }
                }
            }
            ////

            BC.ONECHECKOUT.saveOrderStatus = true;
            BC.ONECHECKOUT.Plugin.dispatch('saveOrderBefore');
            if (BC.ONECHECKOUT.Checkout.isVirtual===false){
                BC.ONECHECKOUT.Checkout.lockPlaceOrder();
                BC.ONECHECKOUT.Shipping.saveShippingMethod();
            }else{
                BC.ONECHECKOUT.validatePayment();
            }
        });

    },



    /** INIT CHAGE PAYMENT METHOD **/
    initPayment: function(){

        BC.ONECHECKOUT.removeNotAllowedPaymentMethods();

        BC.ONECHECKOUT.bindChangePaymentFields();
        $j_bc(document).on('click', '#co-payment-form input[type="radio"]', function(event){
            BC.ONECHECKOUT.removeNotAllowedPaymentMethods();

            BC.ONECHECKOUT.validatePayment();
        });
    },

    /** remove not allowed payment method **/
    removeNotAllowedPaymentMethods: function(){
        // remove p_method_authorizenet_directpost
        var auth_dp_obj = $j_bc('#p_method_authorizenet_directpost');
        if(auth_dp_obj && auth_dp_obj.attr('id') == 'p_method_authorizenet_directpost')
        {
            if(auth_dp_obj.attr('checked'))
                auth_dp_obj.attr('checked', false);

            auth_dp_obj.parent('dt').remove();
            $j_bc('#payment_form_authorizenet_directpost').parent('dd').remove();
            $j_bc('#directpost-iframe').remove();
            $j_bc('#co-directpost-form').remove();
        }
        ////
    },

    /** CHECK PAYMENT IF PAYMENT IF CHECKED AND ALL REQUIRED FIELD ARE FILLED PUSH TO SAVE **/
    validatePayment: function(){

        // check all required fields not empty
        var is_empty = false;
        $j_bc('#co-payment-form .required-entry').each(function(){
            if($j_bc(this).val() == '' && $j_bc(this).css('display') != 'none' && !$j_bc(this).attr('disabled'))
                is_empty = true;
        });

        if(!BC.ONECHECKOUT.saveOrderStatus){
            if(is_empty){
                BC.ONECHECKOUT.saveOrderStatus = false;
                BC.ONECHECKOUT.Checkout.hideLoader();
                BC.ONECHECKOUT.Checkout.unlockPlaceOrder();
                return false;
            }
        }
        ////

        var vp = payment.validate();
        if(!vp)
        {
            BC.ONECHECKOUT.saveOrderStatus = false;
            BC.ONECHECKOUT.Checkout.hideLoader();
            BC.ONECHECKOUT.Checkout.unlockPlaceOrder();
            return false;
        }

        var paymentMethodForm = new Validation('co-payment-form', { onSubmit : false, stopOnFirst : false, focusOnError : false});

        if (paymentMethodForm.validate()){
            BC.ONECHECKOUT.savePayment();
        }else{
            BC.ONECHECKOUT.saveOrderStatus = false;
            BC.ONECHECKOUT.Checkout.hideLoader();
            BC.ONECHECKOUT.Checkout.unlockPlaceOrder();

            BC.ONECHECKOUT.bindChangePaymentFields();
        }


    },

    /** BIND CHANGE PAYMENT FIELDS **/
    bindChangePaymentFields: function(){
        BC.ONECHECKOUT.unbindChangePaymentFields();

        $j_bc('#co-payment-form input').keyup(function(event){

            if (BC.ONECHECKOUT.Checkout.ajaxProgress!=false){
                clearTimeout(BC.ONECHECKOUT.Checkout.ajaxProgress);
            }

            BC.ONECHECKOUT.Checkout.ajaxProgress = setTimeout(function(){
                BC.ONECHECKOUT.validatePayment();
            }, 1000);
        });

        $j_bc('#co-payment-form select').change(function(event){
            if (BC.ONECHECKOUT.Checkout.ajaxProgress!=false){
                clearTimeout(BC.ONECHECKOUT.Checkout.ajaxProgress);
            }

            BC.ONECHECKOUT.Checkout.ajaxProgress = setTimeout(function(){
                BC.ONECHECKOUT.validatePayment();
            }, 1000);
        });
    },

    /** UNBIND CHANGE PAYMENT FIELDS **/
    unbindChangePaymentFields: function(){
        $j_bc('#co-payment-form input').unbind('keyup');
        $j_bc('#co-payment-form select').unbind('change');
    },


    /** SAVE PAYMENT **/
    savePayment: function(){

        if (BC.ONECHECKOUT.Checkout.xhr!=null){
            BC.ONECHECKOUT.Checkout.xhr.abort();
        }

        BC.ONECHECKOUT.Checkout.lockPlaceOrder();
        if (payment.currentMethod != 'stripe') {
            var form = $j_bc('#co-payment-form').serializeArray();

            BC.ONECHECKOUT.Checkout.xhr = $j_bc.post(BC.ONECHECKOUT.Checkout.config.baseUrl + 'bc_checkout/index/savePayment',form, BC.ONECHECKOUT.preparePaymentResponse,'json');
        }else{

            if (typeof(IWD.Stripe)!="undefined"){
                var nameValue = $('stripe_cc_owner').value;
                var numberValue = $('stripe_cc_number').value;
                var cvcValue =  $('stripe_cc_cid').value;
                var exp_monthValue = $('stripe_expiration').value;
                var exp_yearValue = $('stripe_expiration_yr').value;
            }else{
                //support stripe from ebizmets,				
                var nameValue = $('stripe_cc_owner').value;
                var numberValue = $('stripe_cc_number').value;
                var cvcValue =  $('stripe_cc_cvc').value;
                var exp_monthValue = $('stripe_cc_expiration_month').value;
                var exp_yearValue = $('stripe_cc_expiration_year').value;
            }


            Stripe.createToken({

                name: nameValue,
                number: numberValue,
                cvc: cvcValue,
                exp_month: exp_monthValue,
                exp_year: exp_yearValue

            }, function(status, response) {
                if (response.error) {
                    BC.ONECHECKOUT.Checkout.hideLoader();
                    BC.ONECHECKOUT.Checkout.xhr = null;
                    BC.ONECHECKOUT.Checkout.unlockPlaceOrder();
                    alert(response.error.message);
                } else {

                    if (typeof(IWD.Stripe)!="undefined"){
                        var $form = $j_bc(IWD.Stripe.formId);
                        $j_bc('#stripe_token').remove();
                        $input = $j_bc('<input type="hidden" name="payment[stripe_token]" id="stripe_token" />').val(IWD.Stripe.token);
                        $input.appendTo($form);

                        $('stripe_token').value = response['id'];
                        var form = $j_bc('#co-payment-form').serializeArray();
                        BC.ONECHECKOUT.Checkout.xhr = $j_bc.post(BC.ONECHECKOUT.Checkout.config.baseUrl + 'bc_checkout/index/savePayment',form, BC.ONECHECKOUT.preparePaymentResponse,'json');


                    }else{
                        $('stripe_token').value = response['id'];
                        var form = $j_bc('#co-payment-form').serializeArray();
                        BC.ONECHECKOUT.Checkout.xhr = $j_bc.post(BC.ONECHECKOUT.Checkout.config.baseUrl + 'bc_checkout/index/savePayment',form, BC.ONECHECKOUT.preparePaymentResponse,'json');
                    }
                }
            });
        }
    },

    /** CHECK RESPONSE FROM AJAX AFTER SAVE PAYMENT METHOD **/
    preparePaymentResponse: function(response){
        BC.ONECHECKOUT.Checkout.xhr = null;

        BC.ONECHECKOUT.agreements = $j_bc('#checkout-agreements').serializeArray();

        BC.ONECHECKOUT.getSubscribe();

        if (typeof(response.review)!= "undefined"){
            BC.ONECHECKOUT.Decorator.updateGrandTotal(response);
            $j_bc('#opc-review-block').html(response.review);
            BC.ONECHECKOUT.Checkout.removePrice();

            // need to recheck subscribe and agreenet checkboxes
            BC.ONECHECKOUT.recheckItems();
        }

        if (typeof(response.error) != "undefined"){

            BC.ONECHECKOUT.Plugin.dispatch('error');

            $j_bc('.opc-message-container').html(response.error);
            $j_bc('.opc-message-wrapper').show();
            BC.ONECHECKOUT.Checkout.hideLoader();
            BC.ONECHECKOUT.Checkout.unlockPlaceOrder();
            BC.ONECHECKOUT.saveOrderStatus = false;

            return;
        }

        //SOME PAYMENT METHOD REDIRECT CUSTOMER TO PAYMENT GATEWAY
        if (typeof(response.redirect) != "undefined" && BC.ONECHECKOUT.saveOrderStatus===true){
            BC.ONECHECKOUT.Checkout.xhr = null;
            BC.ONECHECKOUT.Plugin.dispatch('redirectPayment', response.redirect);
            if (BC.ONECHECKOUT.Checkout.xhr==null){
                setLocation(response.redirect);
            }
            else
            {
                BC.ONECHECKOUT.Checkout.hideLoader();
                BC.ONECHECKOUT.Checkout.unlockPlaceOrder();
            }

            return;
        }

        if (BC.ONECHECKOUT.saveOrderStatus===true){
            BC.ONECHECKOUT.saveOrder();
        }
        else
        {
            BC.ONECHECKOUT.Checkout.hideLoader();
            BC.ONECHECKOUT.Checkout.unlockPlaceOrder();
        }

        BC.ONECHECKOUT.Plugin.dispatch('savePaymentAfter');


    },

    /** SAVE ORDER **/
    saveOrder: function(){
        var form = $j_bc('#co-payment-form').serializeArray();
        form  = BC.ONECHECKOUT.checkAgreement(form);
        form  = BC.ONECHECKOUT.checkSubscribe(form);
        form  = BC.ONECHECKOUT.getComment(form);

        BC.ONECHECKOUT.Checkout.showLoader();
        BC.ONECHECKOUT.Checkout.lockPlaceOrder();

        if (BC.ONECHECKOUT.Checkout.config.comment!=="0"){
            BC.ONECHECKOUT.saveCustomerComment();

            setTimeout(function(){
                BC.ONECHECKOUT.callSaveOrder(form);
            },600);
        }
        else
        {
            BC.ONECHECKOUT.callSaveOrder(form);
        }
    },

    callSaveOrder: function(form){
        BC.ONECHECKOUT.Plugin.dispatch('saveOrder');
        BC.ONECHECKOUT.Checkout.xhr = $j_bc.post(BC.ONECHECKOUT.Checkout.saveOrderUrl ,form, BC.ONECHECKOUT.prepareOrderResponse,'json');
    },

    /** SAVE CUSTOMER COMMNET **/
    saveCustomerComment: function(){
        $j_bc.post(BC.ONECHECKOUT.Checkout.config.baseUrl + 'bc_checkout/index/comment',{"comment": $j_bc('#customer_comment').val()});
    },

    getComment: function(form){
        var com = $j_bc('#customer_comment').val();
        form.push({"name":"customer_comment", "value":com});
        return form;
    },

    /** ADD AGGREMENTS TO ORDER FORM **/
    checkAgreement: function(form){
        $j_bc.each(BC.ONECHECKOUT.agreements, function(index, data){
            form.push(data);
        });
        return form;
    },

    /** ADD SUBSCRIBE TO ORDER FORM **/
    getSubscribe: function(){
        if ($j_bc('#is_subscribed').length){
            if ($j_bc('#is_subscribed').is(':checked'))
                BC.ONECHECKOUT.is_subscribe = true;
            else
                BC.ONECHECKOUT.is_subscribe = false;
        }
        else
            BC.ONECHECKOUT.is_subscribe = false;
    },

    checkSubscribe: function(form){

        if(BC.ONECHECKOUT.is_subscribe)
            form.push({"name":"is_subscribed", "value":"1"});
        else
            form.push({"name":"is_subscribed", "value":"0"});

        return form;
    },

    /** Check checkboxes after refreshing review section **/
    recheckItems: function(){
        // check subscribe
        if ($j_bc('#is_subscribed').length){
            if(BC.ONECHECKOUT.is_subscribe)
                $j_bc('#is_subscribed').prop('checked', true);
            else
                $j_bc('#is_subscribed').prop('checked', false);
        }

        // check agree
        BC.ONECHECKOUT.recheckAgree();
    },

    recheckAgree: function(){
        if(BC.ONECHECKOUT.agreements != null){
            $j_bc.each(BC.ONECHECKOUT.agreements, function(index, data){
                $j_bc('#checkout-agreements input').each(function(){
                    if(data.name == $j_bc(this).prop('name'))
                        $j_bc(this).prop('checked', true);
                });
            });
        }
    },

    /** CHECK RESPONSE FROM AJAX AFTER SAVE ORDER **/
    prepareOrderResponse: function(response){
        BC.ONECHECKOUT.Checkout.xhr = null;
        if (typeof(response.error) != "undefined" && response.error!=false){
            BC.ONECHECKOUT.Checkout.hideLoader();
            BC.ONECHECKOUT.Checkout.unlockPlaceOrder();

            BC.ONECHECKOUT.saveOrderStatus = false;
            $j_bc('.opc-message-container').html(response.error);
            $j_bc('.opc-message-wrapper').show();
            BC.ONECHECKOUT.Plugin.dispatch('error');
            return;
        }

        if (typeof(response.error_messages) != "undefined" && response.error_messages!=false){
            BC.ONECHECKOUT.Checkout.hideLoader();
            BC.ONECHECKOUT.Checkout.unlockPlaceOrder();

            BC.ONECHECKOUT.saveOrderStatus = false;
            $j_bc('.opc-message-container').html(response.error_messages);
            $j_bc('.opc-message-wrapper').show();
            BC.ONECHECKOUT.Plugin.dispatch('error');
            return;
        }


        if (typeof(response.redirect) !="undefined"){
            if (response.redirect!==false){
                setLocation(response.redirect);
                return;
            }
        }

        if (typeof(response.update_section) != "undefined"){
            BC.ONECHECKOUT.Checkout.hideLoader();
            BC.ONECHECKOUT.Checkout.unlockPlaceOrder();

            //create catch for default logic  - for not spam errors to console
            try{
                $j_bc('#checkout-' + response.update_section.name + '-load').html(response.update_section.html);
            }catch(e){

            }

            BC.ONECHECKOUT.prepareExtendPaymentForm();
            $j_bc('#payflow-advanced-iframe').show();
            $j_bc('#payflow-link-iframe').show();
            $j_bc('#hss-iframe').show();

        }
        BC.ONECHECKOUT.Checkout.hideLoader();
        BC.ONECHECKOUT.Checkout.unlockPlaceOrder();

        BC.ONECHECKOUT.Plugin.dispatch('responseSaveOrder', response);
    }


};



BC.ONECHECKOUT.Checkout = {
    config:null,
    ajaxProgress:false,
    xhr: null,
    isVirtual: false,
    disabledSave: false,
    saveOrderUrl: null,
    xhr2: null,
    updateShippingPaymentProgress: false,

    init:function(){

        if (this.config==null){
            return;
        }
        //base config
        this.config = $j_bc.parseJSON(this.config);

        BC.ONECHECKOUT.Checkout.saveOrderUrl = BC.ONECHECKOUT.Checkout.config.baseUrl + 'bc_checkout/index/saveOrder',
            this.success = BC.ONECHECKOUT.Checkout.config.baseUrl + 'checkout/onepage/success',

            //DECORATE
            this.clearOnChange();
        this.removePrice();

        //MAIN FUNCTION
        BC.ONECHECKOUT.Billing.init();
        BC.ONECHECKOUT.Shipping.init();
        BC.ONECHECKOUT.initMessages();
        BC.ONECHECKOUT.initSaveOrder();


        if (this.config.isLoggedIn===1){
            var addressId = $j_bc('#billing-address-select').val();
            if (addressId!='' && addressId!=undefined ){
                BC.ONECHECKOUT.Billing.save();
            }else{
                //FIX FOR MAGENTO 1.8 - NEED LOAD PAYTMENT METHOD BY AJAX
                BC.ONECHECKOUT.Checkout.pullPayments();
            }
        }else{
            //FIX FOR MAGENTO 1.8 - NEED LOAD PAYTMENT METHOD BY AJAX
            BC.ONECHECKOUT.Checkout.pullPayments();
        }

        BC.ONECHECKOUT.initPayment();
    },

    /** PARSE RESPONSE FROM AJAX SAVE BILLING AND SHIPPING METHOD **/
    prepareAddressResponse: function(response){
        BC.ONECHECKOUT.Checkout.xhr = null;

        if (typeof(response.error) != "undefined"){
            $j_bc('.opc-message-container').html(response.message);
            $j_bc('.opc-message-wrapper').show();
            BC.ONECHECKOUT.Checkout.hideLoader();
            BC.ONECHECKOUT.Checkout.unlockPlaceOrder();
            return;
        }

        /* IWD ADDRESS VALIDATION  */
        if (typeof(response.address_validation) != "undefined"){
            $j_bc('#checkout-address-validation-load').empty().html(response.address_validation);
            BC.ONECHECKOUT.Checkout.hideLoader();
            BC.ONECHECKOUT.Checkout.unlockPlaceOrder();
            return;
        }

        if (typeof(response.shipping) != "undefined"){
            $j_bc('#shipping-block-methods').empty().html(response.shipping);
        }

        if (typeof(response.payments) != "undefined"){
            $j_bc('#checkout-payment-method-load').empty().html(response.payments);

            BC.ONECHECKOUT.removeNotAllowedPaymentMethods();
            payment.initWhatIsCvvListeners();//default logic for view "what is this?"
        }

        if (typeof(response.isVirtual) != "undefined"){
            BC.ONECHECKOUT.Checkout.isVirtual = true;
        }

        if (BC.ONECHECKOUT.Checkout.isVirtual===false){
            var update_payments = false;
            if (typeof(response.reload_payments) != "undefined")
                update_payments = true;

            var reload_totals = false;
            if (typeof(response.reload_totals) != "undefined")
                reload_totals = true;

            BC.ONECHECKOUT.Shipping.saveShippingMethod(update_payments, reload_totals);

        }else{
            $j_bc('.shipping-block').hide();
            $j_bc('.payment-block').addClass('clear-margin');
            BC.ONECHECKOUT.Checkout.pullPayments();
        }
    },

    /** PARSE RESPONSE FROM AJAX SAVE SHIPPING METHOD **/
    prepareShippingMethodResponse: function(response){
        BC.ONECHECKOUT.Checkout.xhr = null;
        if (typeof(response.error)!="undefined"){

            BC.ONECHECKOUT.Checkout.hideLoader();
            BC.ONECHECKOUT.Checkout.unlockPlaceOrder();

            BC.ONECHECKOUT.Plugin.dispatch('error');

            $j_bc('.opc-message-container').html(response.message);
            $j_bc('.opc-message-wrapper').show();
            BC.ONECHECKOUT.saveOrderStatus = false;
            return;
        }

        if (typeof(response.review)!="undefined" && BC.ONECHECKOUT.saveOrderStatus===false){
            try{
                BC.ONECHECKOUT.Decorator.updateGrandTotal(response);
                $j_bc('#opc-review-block').html(response.review);
            }catch(e){

            }
            BC.ONECHECKOUT.Checkout.removePrice();

//				BC.ONECHECKOUT.recheckAgree();
        }



        //IF STATUS TRUE - START SAVE PAYMENT FOR CREATE ORDER
        if (BC.ONECHECKOUT.saveOrderStatus==true){
            BC.ONECHECKOUT.validatePayment();
        }else{
            BC.ONECHECKOUT.Checkout.pullPayments();
        }
    },


    clearOnChange: function(){
        $j_bc('.opc-col-left input, .opc-col-left select').removeAttr('onclick').removeAttr('onchange');
    },

    removePrice: function(){

        $j_bc('.opc-data-table tr th:nth-child(2)').remove();
        $j_bc('.opc-data-table tbody tr td:nth-child(2)').remove();
        $j_bc('.opc-data-table tfoot td').each(function(){
            var colspan = $j_bc(this).attr('colspan');

            if (colspan!="" && colspan !=undefined){
                colspan = parseInt(colspan) - 1;
                $j_bc(this).attr('colspan', colspan);
            }
        });

        $j_bc('.opc-data-table tfoot th').each(function(){
            var colspan = $j_bc(this).attr('colspan');

            if (colspan!="" && colspan !=undefined){
                colspan = parseInt(colspan) - 1;
                $j_bc(this).attr('colspan', colspan);
            }
        });

    },

    showLoader: function(){
        $j_bc('.opc-ajax-loader').show();
        //$j_bc('.opc-btn-checkout').addClass('button-disabled');
    },

    hideLoader: function(){
        setTimeout(function(){
            $j_bc('.opc-ajax-loader').hide();
            //$j_bc('.opc-btn-checkout').removeClass('button-disabled');				
        },600);
    },

    /** APPLY SHIPPING METHOD FORM TO BILLING FORM **/
    applyShippingMethod: function(form){
        formShippimgMethods = $j_bc('#opc-co-shipping-method-form').serializeArray();
        $j_bc.each(formShippimgMethods, function(index, data){
            form.push(data);
        });

        return form;
    },

    /** APPLY NEWSLETTER TO BILLING FORM **/
    applySubscribed: function(form){
        if ($j_bc('#is_subscribed').length){
            if ($j_bc('#is_subscribed').is(':checked')){
                form.push({"name":"is_subscribed", "value":"1"});
            }
        }

        return form;
    },

    /** PULL REVIEW **/
    pullReview: function(){
        BC.ONECHECKOUT.Checkout.lockPlaceOrder();
        BC.ONECHECKOUT.Checkout.xhr = $j_bc.post(BC.ONECHECKOUT.Checkout.config.baseUrl + 'bc_checkout/index/review',function(response){
            BC.ONECHECKOUT.Checkout.xhr = null;
            BC.ONECHECKOUT.Checkout.hideLoader();
            BC.ONECHECKOUT.Checkout.unlockPlaceOrder();
            if (typeof(response.review)!="undefined"){
                BC.ONECHECKOUT.Decorator.updateGrandTotal(response);
                $j_bc('#opc-review-block').html(response.review);

                BC.ONECHECKOUT.Checkout.removePrice();

//					BC.ONECHECKOUT.recheckAgree();
            }
            BC.ONECHECKOUT.removeNotAllowedPaymentMethods();
        });
    },

    /** PULL PAYMENTS METHOD AFTER LOAD PAGE **/
    pullPayments: function(){
        BC.ONECHECKOUT.Checkout.lockPlaceOrder();
        BC.ONECHECKOUT.Checkout.xhr = $j_bc.post(BC.ONECHECKOUT.Checkout.config.baseUrl + 'bc_checkout/index/payments',function(response){
            BC.ONECHECKOUT.Checkout.xhr = null;

            if (typeof(response.error)!="undefined"){
                $j_bc('.opc-message-container').html(response.error);
                $j_bc('.opc-message-wrapper').show();
                BC.ONECHECKOUT.saveOrderStatus = false;
                BC.ONECHECKOUT.Checkout.hideLoader();
                BC.ONECHECKOUT.Checkout.unlockPlaceOrder();
                return;
            }

            if (typeof(response.payments)!="undefined"){
                $j_bc('#checkout-payment-method-load').html(response.payments);

                payment.initWhatIsCvvListeners();
                BC.ONECHECKOUT.bindChangePaymentFields();
                BC.ONECHECKOUT.Decorator.setCurrentPaymentActive();
            };

            BC.ONECHECKOUT.Checkout.pullReview();

        },'json');
    },

    lockPlaceOrder: function(mode){
        if(typeof(mode)=='undefined' || mode == undefined || !mode)
            mode = 0;
        if(mode == 0)
            $j_bc('.opc-btn-checkout').addClass('button-disabled');
        BC.ONECHECKOUT.Checkout.disabledSave = true;
    },

    unlockPlaceOrder: function(){
        $j_bc('.opc-btn-checkout').removeClass('button-disabled');
        BC.ONECHECKOUT.Checkout.disabledSave = false;
    },

    abortAjax: function(){
        if (BC.ONECHECKOUT.Checkout.xhr!=null){
            BC.ONECHECKOUT.Checkout.xhr.abort();

            BC.ONECHECKOUT.saveOrderStatus = false;
            BC.ONECHECKOUT.Checkout.hideLoader();
            BC.ONECHECKOUT.Checkout.unlockPlaceOrder();
        }
    },

    reloadShippingsPayments: function(form_type, delay){
        if(typeof(delay) == 'undefined' || delay == undefined || !delay)
            delay = 1400;

        clearTimeout(BC.ONECHECKOUT.Checkout.updateShippingPaymentProgress);

        BC.ONECHECKOUT.Checkout.updateShippingPaymentProgress = setTimeout(function(){

            var form = $j_bc('#opc-address-form-'+form_type).serializeArray();
            form = BC.ONECHECKOUT.Checkout.applyShippingMethod(form);

            if (BC.ONECHECKOUT.Checkout.xhr2!=null)
                BC.ONECHECKOUT.Checkout.xhr2.abort();

            BC.ONECHECKOUT.Checkout.xhr2 = $j_bc.post(BC.ONECHECKOUT.Checkout.config.baseUrl + 'bc_checkout/index/reloadShippingsPayments',form, BC.ONECHECKOUT.Checkout.reloadShippingsPaymentsResponse,'json');

        }, delay);

    },

    reloadShippingsPaymentsResponse: function(response){

        BC.ONECHECKOUT.Checkout.xhr2 = null;

        if (typeof(response.error) != "undefined"){
            $j_bc('.opc-message-container').html(response.message);
            $j_bc('.opc-message-wrapper').show();
            BC.ONECHECKOUT.Checkout.hideLoader();
            BC.ONECHECKOUT.Checkout.unlockPlaceOrder();
            return;
        }

        if (typeof(response.shipping) != "undefined"){
            $j_bc('#shipping-block-methods').empty().html(response.shipping);
        }

        if (typeof(response.payments) != "undefined"){

            if(response.payments != ''){
                $j_bc('#checkout-payment-method-load').empty().html(response.payments);

                BC.ONECHECKOUT.removeNotAllowedPaymentMethods();
                payment.initWhatIsCvvListeners();//default logic for view "what is this?"
            }

            if (BC.ONECHECKOUT.Checkout.isVirtual===false){
                var update_payments = false;
                if (typeof(response.reload_payments) != "undefined")
                    update_payments = true;

                BC.ONECHECKOUT.Shipping.saveShippingMethod(update_payments);
            }else{
                $j_bc('.shipping-block').hide();
                $j_bc('.payment-block').addClass('clear-margin');
                BC.ONECHECKOUT.Checkout.pullPayments();
            }
        }
        else{
            if(typeof(response.reload_totals) != "undefined")
                BC.ONECHECKOUT.Checkout.pullReview();
        }
    },

    checkRunReloadShippingsPayments: function(address_type){
        var zip = $j_bc('#'+address_type+':postcode').val();
        var country = $j_bc('#'+address_type+':country_id').val();
        var region = $j_bc('#'+address_type+':region_id').val();

        if(zip != '' || country != '' || region != '')
            BC.ONECHECKOUT.Checkout.reloadShippingsPayments(address_type);
    }
};


BC.ONECHECKOUT.Billing = {
    bill_need_update: true,
    need_reload_shippings_payments: false,
    validate_timeout: false,

    init: function(){
        BC.ONECHECKOUT.Billing.bill_need_update = true;

        //set flag use billing for shipping and init change flag
        var use_for_ship = false;
        var el = $j_bc('input[name="billing[use_for_shipping]"]');
        if(typeof(el) != 'undefined' && el != undefined && el){
            if(el.prop('type') == 'checkbox'){
                if(el.is(':checked'))
                    use_for_ship = true;
            }
            else
                use_for_ship = true;
        }
        else
            use_for_ship = true;

        if(use_for_ship)
            this.setBillingForShipping(true);
        else
            this.setBillingForShipping(false, true);
        ////

        $j_bc('input[name="billing[use_for_shipping]"]').change(function(){
            if ($j_bc(this).is(':checked')){
                BC.ONECHECKOUT.Billing.setBillingForShipping(true);
                $j_bc('#opc-address-form-billing select[name="billing[country_id]"]').change();
                BC.ONECHECKOUT.Billing.need_reload_shippings_payments = 'billing';
                BC.ONECHECKOUT.Billing.validateForm();
            }else{
                BC.ONECHECKOUT.Billing.setBillingForShipping(false);
                BC.ONECHECKOUT.Billing.need_reload_shippings_payments = 'shipping';
                BC.ONECHECKOUT.Shipping.validateForm();
            }
        });

        $j_bc('input[name="billing[save_in_address_book]"]').click(function(){
            BC.ONECHECKOUT.Billing.bill_need_update = true;
            BC.ONECHECKOUT.Billing.validateForm();
        });

        //update password field
        $j_bc('input[name="billing[create_account]"]').click(function(){
            if ($j_bc(this).is(':checked')){
                $j_bc('#register-customer-password').removeClass('hidden');
                $j_bc('input[name="billing[customer_password]"]').addClass('required-entry');
                $j_bc('input[name="billing[confirm_password]"]').addClass('required-entry');
            }else{
                $j_bc('#register-customer-password').addClass('hidden');
                $j_bc('input[name="billing[customer_password]"]').removeClass('required-entry');
                $j_bc('input[name="billing[confirm_password]"]').removeClass('required-entry');
                $j_bc('#register-customer-password input').val('');
            }
        });

        this.initChangeAddress();
        this.initChangeSelectAddress();
    },

    /** CREATE EVENT FOR UPDATE SHIPPING BLOCK **/
    initChangeAddress: function(){

        $j_bc('#opc-address-form-billing input').blur(function(){
            if(BC.ONECHECKOUT.Billing.bill_need_update)
                BC.ONECHECKOUT.Billing.validateForm();
        });

        $j_bc('#opc-address-form-billing').mouseleave(function(){
            if(BC.ONECHECKOUT.Billing.bill_need_update)
                BC.ONECHECKOUT.Billing.validateForm();
        });

        $j_bc('#opc-address-form-billing input').keydown(function(){
            BC.ONECHECKOUT.Billing.bill_need_update = true;
            clearTimeout(BC.ONECHECKOUT.Checkout.ajaxProgress);
            BC.ONECHECKOUT.Checkout.abortAjax();

            // check if zip
            var el_id = $j_bc(this).attr('id');
            if(el_id == 'billing:postcode')
                BC.ONECHECKOUT.Checkout.reloadShippingsPayments('billing');

            BC.ONECHECKOUT.Billing.validateForm(3000);
        });

        $j_bc('#opc-address-form-billing select').not('#billing-address-select').change(function(){
            // check if country
            var el_id = $j_bc(this).attr('id');
            if(el_id == 'billing:country_id' || el_id == 'billing:region_id')
                BC.ONECHECKOUT.Checkout.reloadShippingsPayments('billing', 800);

            BC.ONECHECKOUT.Billing.bill_need_update = true;
            BC.ONECHECKOUT.Billing.validateForm();
        });
    },

    validateForm: function(delay){
        clearTimeout(BC.ONECHECKOUT.Billing.validate_timeout);
        if(typeof(delay) == 'undefined' || delay == undefined || !delay)
            delay = 100;

        BC.ONECHECKOUT.Billing.validate_timeout = setTimeout(function(){
            var mode = BC.ONECHECKOUT.Billing.need_reload_shippings_payment;
            BC.ONECHECKOUT.Billing.need_reload_shippings_payment = false;

            var valid = BC.ONECHECKOUT.Billing.validateAddressForm();
            if (valid){
                BC.ONECHECKOUT.Billing.save();
            }
            else{
                if(mode != false)
                    BC.ONECHECKOUT.Checkout.checkRunReloadShippingsPayments(mode);
            }
        },delay);
    },


    /** CREATE EVENT FOR CHANGE ADDRESS TO NEW OR FROM ADDRESS BOOK **/
    initChangeSelectAddress: function(){
        $j_bc('#billing-address-select').change(function(){
            if ($j_bc(this).val()==''){
                $j_bc('#billing-new-address-form').show();
            }else{
                $j_bc('#billing-new-address-form').hide();
                BC.ONECHECKOUT.Billing.validateForm();
            }
        });


    },

    /** VALIDATE ADDRESS BEFORE SEND TO SAVE QUOTE**/
    validateAddressForm: function(form){
        // check all required fields not empty
        var is_empty = false;
        $j_bc('#opc-address-form-billing .required-entry').each(function(){
            if($j_bc(this).val() == '' && $j_bc(this).css('display') != 'none' && !$j_bc(this).attr('disabled'))
                is_empty = true;
        });
        if(is_empty)
            return false;
        ////

        var addressForm = new Validation('opc-address-form-billing', { onSubmit : false, stopOnFirst : false, focusOnError : false});
        if (addressForm.validate()){
            return true;
        }else{
            return false;
        }
    },

    /** SET SHIPPING AS BILLING TO TRUE OR FALSE **/
    setBillingForShipping:function(useBilling, skip_copy){
        if (useBilling==true){
            $j_bc('input[name="billing[use_for_shipping]"]').prop('checked', true);
            $j_bc('input[name="shipping[same_as_billing]"]').prop('checked', true);
            $j_bc('#opc-address-form-shipping').addClass('hidden');
        }else{
            if(typeof(skip_copy) == 'undefined' || skip_copy == undefined)
                skip_copy = false
            if(!skip_copy)
                this.pushBilingToShipping();
            $j_bc('input[name="billing[use_for_shipping]"]').prop('checked', false);
            $j_bc('input[name="shipping[same_as_billing]"]').prop('checked', false);
            $j_bc('#opc-address-form-shipping').removeClass('hidden');
        }

    },

    /** COPY FIELD FROM BILLING FORM TO SHIPPING **/
    pushBilingToShipping:function(clearShippingForm){
        //pull country
        var valueCountry = $j_bc('#billing-new-address-form select[name="billing[country_id]"]').val();
        $j_bc('#opc-address-form-shipping  select[name="shipping[country_id]"] [value="' + valueCountry + '"]').prop("selected", true);
        shippingRegionUpdater.update();


        //pull region id
        var valueRegionId = $j_bc('#billing-new-address-form select[name="billing[region_id]"]').val();
        $j_bc('#opc-address-form-shipping  select[name="shipping[region_id]"] [value="' + valueRegionId + '"]').prop("selected", true);

        //pull other fields	
        $j_bc('#billing-new-address-form input').not(':hidden, :input[type="checkbox"]').each(function(){
            var name = $j_bc(this).attr('name');
            var value = $j_bc(this).val();
            var shippingName =  name.replace( /billing/ , 'shipping');

            $j_bc('#opc-address-form-shipping input[name="'+shippingName+'"]').val(value);

        });

        //pull address field
        $j_bc('#billing-new-address-form input[name="billing[street][]"]').each(function(indexBilling){
            var valueAddress = $j_bc(this).val();
            $j_bc('#opc-address-form-shipping input[name="shipping[street][]"]').each(function(indexShipping){
                if (indexBilling==indexShipping){
                    $j_bc(this).val(valueAddress);
                }
            });
        });

        //init trigger change shipping form
        $j_bc('#opc-address-form-shipping select[name="shipping[country_id]"]').change();
    },

    /** METHOD CREATE AJAX REQUEST FOR UPDATE BILLING ADDRESS **/
    save: function(){
        if (BC.ONECHECKOUT.Checkout.ajaxProgress!=false){
            clearTimeout(BC.ONECHECKOUT.Checkout.ajaxProgress);
        }

        // stop reload shippings/payments logic
        if (BC.ONECHECKOUT.Checkout.updateShippingPaymentProgress!=false)
            clearTimeout(BC.ONECHECKOUT.Checkout.updateShippingPaymentProgress);

        if (BC.ONECHECKOUT.Checkout.xhr2!=null)
            BC.ONECHECKOUT.Checkout.xhr2.abort();
        ////

        BC.ONECHECKOUT.Checkout.ajaxProgress = setTimeout(function(){
            var form = $j_bc('#opc-address-form-billing').serializeArray();
            form = BC.ONECHECKOUT.Checkout.applyShippingMethod(form);
            form = BC.ONECHECKOUT.Checkout.applySubscribed(form);

            if (BC.ONECHECKOUT.Checkout.xhr!=null){
                BC.ONECHECKOUT.Checkout.xhr.abort();
            }

            if($j_bc('input[name="billing[use_for_shipping]"]').is(':checked'))
                BC.ONECHECKOUT.Checkout.showLoader();
            else
                BC.ONECHECKOUT.Checkout.lockPlaceOrder(1);

            BC.ONECHECKOUT.Billing.bill_need_update = false;
            BC.ONECHECKOUT.Checkout.xhr = $j_bc.post(BC.ONECHECKOUT.Checkout.config.baseUrl + 'bc_checkout/index/saveBilling',form, BC.ONECHECKOUT.Checkout.prepareAddressResponse,'json');
        }, 500);
    }

};

BC.ONECHECKOUT.Shipping = {
    ship_need_update: true,
    validate_timeout: false,

    init: function(){
        BC.ONECHECKOUT.Shipping.ship_need_update = true;

        $j_bc('input[name="shipping[save_in_address_book]"]').click(function(){
            BC.ONECHECKOUT.Shipping.ship_need_update = true;
            BC.ONECHECKOUT.Shipping.validateForm();
        });

        this.initChangeAddress();
        this.initChangeSelectAddress();
        this.initChangeShippingMethod();
    },

    /** CREATE EVENT FOR UPDATE SHIPPING BLOCK **/
    initChangeAddress: function(){

        $j_bc('#opc-address-form-shipping input').blur(function(){
            if(BC.ONECHECKOUT.Shipping.ship_need_update)
                BC.ONECHECKOUT.Shipping.validateForm();
        });

        $j_bc('#opc-address-form-shipping').mouseleave(function(){
            if(BC.ONECHECKOUT.Shipping.ship_need_update)
                BC.ONECHECKOUT.Shipping.validateForm();
        });

        $j_bc('#opc-address-form-shipping input').keydown(function(){
            BC.ONECHECKOUT.Shipping.ship_need_update = true;
            clearTimeout(BC.ONECHECKOUT.Checkout.ajaxProgress);
            BC.ONECHECKOUT.Checkout.abortAjax();

            // check if zip
            var el_id = $j_bc(this).attr('id');
            if(el_id == 'shipping:postcode')
                BC.ONECHECKOUT.Checkout.reloadShippingsPayments('shipping');

            BC.ONECHECKOUT.Shipping.validateForm(3000);

        });

        $j_bc('#opc-address-form-shipping select').not('#shipping-address-select').change(function(){
            // check if country
            var el_id = $j_bc(this).attr('id');
            if(el_id == 'shipping:country_id' || el_id == 'shipping:region_id')
                BC.ONECHECKOUT.Checkout.reloadShippingsPayments('shipping', 800);

            BC.ONECHECKOUT.Shipping.ship_need_update = true;
            BC.ONECHECKOUT.Shipping.validateForm();
        });
    },

    /** CREATE VENT FOR CHANGE ADDRESS TO NEW OR FROM ADDRESS BOOK **/
    initChangeSelectAddress: function(){
        $j_bc('#shipping-address-select').change(function(){
            if ($j_bc(this).val()==''){
                $j_bc('#shipping-new-address-form').show();
                BC.ONECHECKOUT.Shipping.validateForm();
            }else{
                $j_bc('#shipping-new-address-form').hide();
                BC.ONECHECKOUT.Shipping.validateForm();
            }
        });


    },

    //create observer for change shipping method. 
    initChangeShippingMethod: function(){
        $j_bc('.opc-wrapper-opc #shipping-block-methods').on('change', 'input[type="radio"]', function(){
            BC.ONECHECKOUT.Shipping.saveShippingMethod();
        });
    },

    validateForm: function(delay){
        clearTimeout(BC.ONECHECKOUT.Shipping.validate_timeout);
        if(typeof(delay) == 'undefined' || delay == undefined || !delay)
            delay = 100;

        BC.ONECHECKOUT.Shipping.validate_timeout = setTimeout(function(){
            var mode = BC.ONECHECKOUT.Billing.need_reload_shippings_payment;
            BC.ONECHECKOUT.Billing.need_reload_shippings_payment = false;

            var valid = BC.ONECHECKOUT.Shipping.validateAddressForm();
            if (valid){
                BC.ONECHECKOUT.Shipping.save();
            }
            else{
                if(mode != false)
                    BC.ONECHECKOUT.Checkout.checkRunReloadShippingsPayments(mode);
            }
        },delay);
    },

    /** VALIDATE ADDRESS BEFORE SEND TO SAVE QUOTE**/
    validateAddressForm: function(form){
        // check all required fields not empty
        var is_empty = false;
        $j_bc('#opc-address-form-shipping .required-entry').each(function(){
            if($j_bc(this).val() == '' && $j_bc(this).css('display') != 'none' && !$j_bc(this).attr('disabled'))
                is_empty = true;
        });

        if(is_empty)
            return false;
        ////

        var addressForm = new Validation('opc-address-form-shipping', { onSubmit : false, stopOnFirst : false, focusOnError : false});
        if (addressForm.validate()){
            return true;
        }else{
            return false;
        }
    },

    /** METHOD CREATE AJAX REQUEST FOR UPDATE SHIPPIN METHOD **/
    save: function(){
        if (BC.ONECHECKOUT.Checkout.ajaxProgress!=false){
            clearTimeout(BC.ONECHECKOUT.Checkout.ajaxProgress);
        }

        // stop reload shippings/payments logic
        if (BC.ONECHECKOUT.Checkout.updateShippingPaymentProgress!=false)
            clearTimeout(BC.ONECHECKOUT.Checkout.updateShippingPaymentProgress);

        if (BC.ONECHECKOUT.Checkout.xhr2!=null)
            BC.ONECHECKOUT.Checkout.xhr2.abort();
        ////

        BC.ONECHECKOUT.Checkout.ajaxProgress = setTimeout(function(){
            var form = $j_bc('#opc-address-form-shipping').serializeArray();
            form = BC.ONECHECKOUT.Checkout.applyShippingMethod(form);
            if (BC.ONECHECKOUT.Checkout.xhr!=null){
                BC.ONECHECKOUT.Checkout.xhr.abort();
            }
            BC.ONECHECKOUT.Checkout.lockPlaceOrder(1);

            BC.ONECHECKOUT.Shipping.ship_need_update = false;
            BC.ONECHECKOUT.Checkout.xhr = $j_bc.post(BC.ONECHECKOUT.Checkout.config.baseUrl + 'bc_checkout/index/saveShipping',form, BC.ONECHECKOUT.Checkout.prepareAddressResponse,'json');
        }, 500);
    },

    saveShippingMethod: function(update_payments, reload_totals){

        if (BC.ONECHECKOUT.Shipping.validateShippingMethod()===false){

            if (BC.ONECHECKOUT.saveOrderStatus){
                $j_bc('.opc-message-container').html($j_bc('#pssm_msg').html());
                $j_bc('.opc-message-wrapper').show();
            }
            BC.ONECHECKOUT.saveOrderStatus = false;

            BC.ONECHECKOUT.Checkout.hideLoader();

            if(typeof(update_payments) != 'undefined' && update_payments != undefined && update_payments) // if was request to reload payments
                BC.ONECHECKOUT.Checkout.pullPayments();
            else{
                if(typeof(reload_totals) == 'undefined' || reload_totals == undefined)
                    reload_totals = false;

                if(reload_totals)
                    BC.ONECHECKOUT.Checkout.pullReview();
                else
                    BC.ONECHECKOUT.Checkout.unlockPlaceOrder();
            }

            return;
        }

        if (BC.ONECHECKOUT.Checkout.ajaxProgress!=false){
            clearTimeout(BC.ONECHECKOUT.Checkout.ajaxProgress);
        }

        BC.ONECHECKOUT.Checkout.ajaxProgress = setTimeout(function(){
            var form = $j_bc('#opc-co-shipping-method-form').serializeArray();
            form = BC.ONECHECKOUT.Checkout.applySubscribed(form);
            if (BC.ONECHECKOUT.Checkout.xhr!=null){
                BC.ONECHECKOUT.Checkout.xhr.abort();
            }
            BC.ONECHECKOUT.Checkout.showLoader();
            BC.ONECHECKOUT.Checkout.xhr = $j_bc.post(BC.ONECHECKOUT.Checkout.config.baseUrl + 'bc_checkout/index/saveShippingMethod',form, BC.ONECHECKOUT.Checkout.prepareShippingMethodResponse);
        }, 600);
    },

    validateShippingMethod: function(){
        var shippingChecked = false;
        $j_bc('#opc-co-shipping-method-form input').each(function(){
            if ($j_bc(this).prop('checked')){
                shippingChecked =  true;
            }
        });

        return shippingChecked;
    }
};


BC.ONECHECKOUT.Coupon = {
    init: function(){

        $j_bc(document).on('click', '.apply-coupon', function(){
            BC.ONECHECKOUT.Coupon.applyCoupon(false);
        });


        $j_bc(document).on('click', '.remove-coupon', function(){
            BC.ONECHECKOUT.Coupon.applyCoupon(true);
        });


        $j_bc(document).on('click','.discount-block h3', function(){
            if ($j_bc(this).hasClass('open-block')){
                $j_bc(this).removeClass('open-block');
                $j_bc(this).next().addClass('hidden');
            }else{
                $j_bc(this).addClass('open-block');
                $j_bc(this).next().removeClass('hidden');
            }
        });

    },

    applyCoupon: function(remove){

        var form = $j_bc('#opc-discount-coupon-form').serializeArray();
        if (remove===false){
            form.push({"name":"remove", "value":"0"});
        }else{
            form.push({"name":"remove", "value":"1"});
        }

        BC.ONECHECKOUT.Checkout.showLoader();
        BC.ONECHECKOUT.Checkout.xhr = $j_bc.post(BC.ONECHECKOUT.Checkout.config.baseUrl + 'bc_checkout/coupon/couponPost',form, BC.ONECHECKOUT.Coupon.prepareResponse,'json');
    },

    prepareResponse: function(response){
        BC.ONECHECKOUT.Checkout.xhr = null;
        BC.ONECHECKOUT.Checkout.hideLoader();
        if (typeof(response.message) != "undefined"){
            $j_bc('.opc-message-container').html(response.message);
            $j_bc('.opc-message-wrapper').show();

            BC.ONECHECKOUT.Checkout.pullReview();
        }
        if (typeof(response.coupon) != "undefined"){
            $j_bc('#opc-discount-coupon-form').replaceWith(response.coupon).show();
            $j_bc('#opc-discount-coupon-form').show();
        }
        if (typeof(response.shipping) != "undefined"){
            $j_bc('#shipping-block-methods').empty().html(response.shipping);
        }
        if (typeof(response.payments)!="undefined"){
            $j_bc('#checkout-payment-method-load').html(response.payments);

            BC.ONECHECKOUT.removeNotAllowedPaymentMethods();

            payment.initWhatIsCvvListeners();
            BC.ONECHECKOUT.bindChangePaymentFields();
        };
    }
};

BC.ONECHECKOUT.Comment = {
    init: function(){

        $j_bc(document).on('click','.comment-block h3', function(){
            if ($j_bc(this).hasClass('open-block')){
                $j_bc(this).removeClass('open-block');
                $j_bc(this).next().addClass('hidden');
            }else{
                $j_bc(this).addClass('open-block');
                $j_bc(this).next().removeClass('hidden');
            }
        });
    }
};

BC.ONECHECKOUT.SignatureAtCheckout = {
    init: function(){
        $j_bc(document).on('click','.signature-block h3', function(){
            if ($j_bc(this).hasClass('open-block')){
                $j_bc(this).removeClass('open-block');
                $j_bc(this).next().addClass('hidden');
            }else{
                $j_bc(this).addClass('open-block');
                $j_bc(this).next().removeClass('hidden');
            }
        });

    }
};

BC.ONECHECKOUT.Agreement ={

    init: function(){

        $j_bc(document).on('click', '.view-agreement', function(e){
            e.preventDefault();
            $j_bc('.opc-review-actions #modal-agreement').addClass('md-show');

            var id = $j_bc(this).data('id');
            var title = $j_bc(this).html();
            var content = $j_bc('.opc-review-actions #agreement-block-'+id).html();

            $j_bc('.opc-review-actions #agreement-title').html(title);
            $j_bc('.opc-review-actions #agreement-modal-body').html(content);
        });

        $j_bc(document).on('click', '#checkout-agreements input[name*="agreement"]', function(){
            var cur_el = $j_bc(this);
            $j_bc('#checkout-agreements input').each(function(){

                if(cur_el.prop('name') == $j_bc(this).prop('name')){
                    $j_bc(this).prop('checked', cur_el.prop('checked'));
                }
            });

            // save agreements statuses
            BC.ONECHECKOUT.agreements = $j_bc('#checkout-agreements').serializeArray();
        });
    }
};

BC.ONECHECKOUT.Login ={

    init: function(){
        $j_bc('.opc-login-trigger').click(function(e){
            // detect Social Logic is activated
            var sl_active = false;
            if(typeof(IWD.Signin) != 'undefined' && IWD.Signin != undefined && IWD.Signin){
                if (typeof(SigninConfig)!="undefined"){
                    sl_active = true;
                }
            }

            if(!sl_active){
                e.preventDefault();
                $j_bc('#modal-login').addClass('md-show');
            }
        });

        $j_bc(document).on('click','.md-modal .close', function(e){
            e.preventDefault();
            $j_bc('.md-modal').removeClass('md-show');
        });

        $j_bc(document).on('click','.md-overlay', function(e){
            e.preventDefault();
            $j_bc('.md-modal').removeClass('md-show');
        });

        $j_bc(document).on('click', '.restore-account', function(e){
            e.preventDefault();
            $j_bc('#login-form').hide();$j_bc('#login-button-set').hide();
            $j_bc('#form-validate-email').fadeIn();$j_bc('#forgotpassword-button-set').show();
        });


        $j_bc('#login-button-set .btn').click(function(){
            $j_bc('#login-form').submit();
        });

        $j_bc('#forgotpassword-button-set .btn').click(function(){
            var form = $j_bc('#form-validate-email').serializeArray();
            BC.ONECHECKOUT.Checkout.showLoader();
            BC.ONECHECKOUT.Checkout.xhr = $j_bc.post(BC.ONECHECKOUT.Checkout.config.baseUrl + 'bc_checkout/index/forgotpassword',form, BC.ONECHECKOUT.Login.prepareResponse,'json');
        });


        $j_bc('#forgotpassword-button-set .back-link').click(function(e){
            e.preventDefault();
            $j_bc('#form-validate-email').hide();$j_bc('#forgotpassword-button-set').hide();
            $j_bc('#login-form').fadeIn();$j_bc('#login-button-set').show();

        });

        // if persistent, show login form
        if($j_bc('.opc-login-trigger').hasClass('is_persistent')){
            $j_bc('.signin-modal').trigger('click');
        }

    },

    prepareResponse: function(response){
        BC.ONECHECKOUT.Checkout.xhr = null;
        BC.ONECHECKOUT.Checkout.hideLoader();
        if (typeof(response.error)!="undefined"){
            alert(response.message);
        }else{
            alert(response.message);
            $j_bc('#forgotpassword-button-set .back-link').click();
        }
    }
};

BC.ONECHECKOUT.Decorator = {
    initReviewBlock: function(){
        $j_bc('a.review-total').click(function(){
            if ($j_bc(this).hasClass('open')){
                $j_bc(this).removeClass('open')
                $j_bc('#opc-review-block').addClass('hidden');
            }else{
                $j_bc(this).addClass('open')
                $j_bc('#opc-review-block').removeClass('hidden');
            }
        });
    },
    updateGrandTotal: function(response){
        $j_bc('.opc-review-actions h5 span').html(response.grandTotal);
        $j_bc('.review-total span').html(response.grandTotal);
    },

    setActivePayment: function(){
        //check and setup current active method 
        this.setCurrentPaymentActive();

        $j_bc(document).on('click','#checkout-payment-method-load dt', function(){
            $j_bc('#checkout-payment-method-load dt').removeClass('active');
            $j_bc(this).addClass('active');
        });
    },

    setCurrentPaymentActive: function(){
        var method = payment.currentMethod;
        $j_bc('#p_method_'+method).parent().addClass('active');
    }
};

$j_bc(document).ready(function(){
    BC.ONECHECKOUT.Checkout.init();
    BC.ONECHECKOUT.Coupon.init();
    BC.ONECHECKOUT.Comment.init();
    BC.ONECHECKOUT.Agreement.init();
    BC.ONECHECKOUT.Login.init();
    BC.ONECHECKOUT.Decorator.initReviewBlock();
    BC.ONECHECKOUT.Decorator.setActivePayment();
});
