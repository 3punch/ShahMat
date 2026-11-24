interface Props {
  onChoose: (mode: 'ai' | 'local') => void;
}

export default function MainMenu({ onChoose }: Props) {
  return (
    <div className="menu-wrap">
      <div className="menu-art">
        <img
          src={`${import.meta.env.BASE_URL}menu-art.png`}
          alt="نبرد اساطیر ایران"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
      <h1 className="game-title">شاه‌مات</h1>
      <p className="game-subtitle">نبرد اساطیر ایران‌زمین بر صفحه‌ی سرنوشت</p>
      <div className="menu-buttons">
        <button className="btn" onClick={() => onChoose('ai')}>
          ⚔ نبرد با کامپیوتر
        </button>
        <button className="btn secondary" onClick={() => onChoose('local')}>
          🛡 دو‌نفره‌ی محلی
        </button>
      </div>

      <div className="rules-box">
        <h3>راهنمای سریع</h3>
        <ul>
          <li>با <b>۲۴ امتیاز</b>، هشت قهرمان شاهنامه را برای سپاهت انتخاب کن؛ کی‌خسرو (شاه) رایگان و اجباری است.</li>
          <li>هر قهرمان <b>الگوی حرکت</b> و <b>قابلیت ویژه‌ی خودش</b> را دارد — تیر آرش، گرز رستم، مهر سیمرغ و...</li>
          <li>در هر نوبت: یک حرکت + حداکثر یک قابلیت. بعضی قابلیت‌ها مهره‌ها را سپردار، قفل یا مصون می‌کنند.</li>
          <li>هرکس <b>شاه حریف</b> را بگیرد، برنده‌ی میدان است. کیش و مات در کار نیست!</li>
        </ul>
      </div>
    </div>
  );
}
