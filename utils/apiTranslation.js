"use strict";

class ApiTranslation {
  _texts;

  constructor(texts) {
    this._texts = texts;
  }

  translate(lang = "en", textField) {
    const translateLang = Object.hasOwn(this._texts, lang) ? lang : "en";
    return this._texts[translateLang][textField];
  }
}

const texts = {
  en: {
    noDocument: "There is no document with this id!",
    restrictedAction: "You do not have permission to perform this aciton.",
    notAnImageFile: "Not an image file. Please upload only image files.",
    noFile: "There is not a file in your reuest.",
    cabinHasBooking: "This cabin can not be deleted. It has active bookings.",
    activationMailSend:
      "New user has been created. New user must create a password by clicking the link that was send by email, before log in.",
    emailSendError:
      "There was an error sending the email. Please try again later!",
    invalidActivateToken:
      "This token is invalid or the user has not been created yet. Please contact with your manager.",
    passwordConfirmNotSubmitted:
      "Password or confirmation password is not submitted. Please submit password and confirmation password. ",
    passwordAndConfirmPasswordNotSame:
      "Password and confirm password do not macth.",
    passwordCreated: "Your password has been created. You can log in.",
    emailPasswordNotSubmitted: "Email or password not submitted.",
    noUser: "There is no user registered with this email.",
    newUserNoPassword:
      "Your pasword has not created yet. Please check your mail box.",
    lockecAccount: "Your account has been locked. please contact your manager.",
    tooManyWronAttempt:
      "Too many wrong attempt! Your account has been suspended, please contact your manager.",
    wrongPassword: "Password is incorrect. Please try again.",
    notExistUser: "User is not exist.",
    changedPassword: "Your password has been changed. Please log in again.",
    noRefreshToken: "You do not have a refresh token. Please log in again.",
    userNotLoggedIn: "User not logged in. Please login.",
    refreshTokenNotCorrect: "Submitted token is not correct.",
    unAuthorized: "You do not have permission to perform this action.",
    userNotRegistered:
      "You can not activate this account. The user should click the link send via email and activate this account.",
    roleUpdateForbidden: "You can not update your role.",
    passwordUpdateForbidden:
      "You can not update your password through this route.",
    onlyPasswordUpdate: "Only password can be updated through this route.",
    noCurrentPassword: "Please submit your current password.",
    guestNotMatch:
      "This e-mail address has been recorded for another guest. Your name, or nationality information are not match the recorded guest. Please check the submitted information or change e-mail address.",
    bookingDataMissing: "PNRCode, nationalId or email is missing.",
    noBooking: "There is no booking record. Please check the submitted fields.",
    resetPassword:
      "The password of user has been reset. The user should click the link send via email to create new password.",
    noUser: "There is no user with this id.",
    userCannotDeleted: "This user can not be deleted!",
  },
  tr: {
    noDocument: "Bu id ye sahip bir document bulunmamaktadır!",
    restrictedAction: "Bu işlemi gerçekleştirme yetkiniz bulunmuyor.",
    notAnImageFile:
      "Bu bir imge dosyası değil.Lütfen sadece image dosyası yükleyin",
    noFile: "Yollanan request file nesnesi içermiyor.",
    cabinHasBooking:
      "Bu kabin silinemiyor. Kabine ait aktif rezervasyon bulunuyor.",
    activationMailSend:
      "Yeni kullanıcı oluşturuldu. Yeni kullanıcı oturum açmadan önce elektronik posta ile yollanan linke tıklayarak bir parola oluşturmalıdır.",
    emailSendError:
      "Elektronik posta gönderilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin!",
    invalidActivateToken:
      "Bu token geçerli değil veya kullanıcı henüz oluşturulmamış. Lütfen yöneticiniz ile iletişime geçin.",
    passwordConfirmNotSubmitted:
      "Parola veya onay parolası girilmemiş. Lütfen parolayı ve onay parılasını giriniz.",
    passwordAndConfirmPasswordNotSame: "Parola ve onay parolası eşleşmiyor.",
    passwordCreated: "Parolanız oluşturulmuştur. Oturum açabilirsiniz.",
    emailPasswordNotSubmitted: "Elektronik posta adresi veya parola girilmedi.",
    noUser:
      "Bu elektronik posta adresi ile kayıt edilmiş bir kullanıcı bulunmuyor.",
    newUserNoPassword:
      "Henüz parolanız oluşturulmamış. Lütfen elektronik posta kutunuzu kontrol ediniz.",
    lockecAccount:
      "Hesabınız kilitlenmiştir. Lütfen yöneticiniz ile iletişime geçin.",
    tooManyWronAttempt:
      "Çok fazla hatalı giriş talebi. Hesabınız askıya alınmıştır, lütfen yöneticiniz ile iletişime geçiniz.",
    wrongPassword: "Parola hatalı. Lütfen tekrar deneyin.",
    notExistUser: "Böyle bir kullanıcı bulunmuyor.",
    changedPassword: "Parolanız değiştirildi. Lütfen tekrar oturum açın.",
    noRefreshToken: "Refresh tokeniniz bulunmuyor. Lütfen tekrar oturum açın.",
    userNotLoggedIn: "Kullanıcı oturum açmamış. Lütfen oturum açın.",
    refreshTokenNotCorrect: "Gönderilen token doğru değil.",
    unAuthorized: "Bu işlemi gerçekleştirme yetkiniz bulunmuyor.",
    userNotRegistered:
      "Bu hesabı aktifleştiremezsiniz. Kullanıcı elektronik posta ile kendisine yollanan linke tıklayarak hesabını aktifleştirmeli.",
    roleUpdateForbidden: "Rolünüzü değiştiremezsiniz.",
    passwordUpdateForbidden:
      "Parolanızı bu bağlantı üzerinden değiştiremezsiniz.",
    onlyPasswordUpdate:
      "Bu bağlantı üzerinden sadece parolanızı güncelleyebilirsiniz.",
    noCurrentPassword: "Lütfen mevcut parolanızı giriniz.",
    guestNotMatch:
      "Bu elektronik posta adresi başka bir misafir adına kayıt edilmiş. Adınız veya kimlik bilgileriniz kayıtlı kullanıcının bilgileri ile uyuşmuyor. Lütfen bilgileri kontrol edin veya başka bir elektronik posta adresi girin.",
    bookingDataMissing: "PNRCode, nationalId veya email bilgisi eksik.",
    noBooking:
      "Rezervasyon kaydı bulunamadı. Lütfen iletilen bilgileri kontrol ediniz.",
    resetPassword:
      "Parola sıfırlandı. Kullanıcı yeni porola belirlemek için, lektronik posta adresine yollanan linki tıklamalıdır.",
    noUser: "Kullanıcı bulunamadı.",
    userCannotDeleted: "Bu kullanıcı silinemez!",
  },
};

export default new ApiTranslation(texts);
