# 구현 이유
Facebook이라고 이름은 붙였지만 data chunk를 연속적으로 처리해 비디오를 업로드하는 대부분의 상황에서 사용가능하다. Node.js만을 사용하여 최대한 low하게 구현 해볼 기회라고 생각했다. SDK를 NPM에서 사용할 수 있지만, 사용하지 않았다. 의존성을 최대한 배제하고자 했다.

# 서버
혹시라도 사용해볼 사람이 있다면 서버로서 구동시키기 위하여 Nest.js를 사용했지만 사실 로직 구현과 Nest.js는 전혀 관계가 없다. facebook.service.ts만 따로 떼어내 사용해도 상관없다.

# Get Page ID -> Start -> Transfer -> Finish
모든 과정은 stream과 buffer를 사용하여 처리된다. 

# Conclusion
Node 내장 라이브러리는 알아두면 패키지 의존성 없이 개발하는데 정말 많은 도움이 된다. 범용성 측면에서도 뛰어나다. 일례로, 대부분의 미디어 플랫폼은 chunk data를 통한 미디어 업로드를 지원하는데,
이 repo에서 구현하는 방식을 그냥 함수 이름만 바꿔서 갈아끼울 수 있다.

## 서버 구동을 제외한 모든 코드는 facebook.serivce.ts에 있습니다.
